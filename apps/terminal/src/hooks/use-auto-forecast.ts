import { HL_ALL_DEXS } from "@/config/app";
import { useAllDexsAccountState } from "@/hooks/trade/use-account-balances";
import { type Forecast, forecastTargets } from "@/lib/auto-trader/forecast";
import { accountEquity } from "@/lib/auto-trader/targets";
import type { AutoTraderSettings, AutoTraderStatus, Signal } from "@/lib/auto-trader/types";
import { useMarkets, useSubscription } from "@/lib/hyperliquid";

const SIGNAL_MAX_AGE_MS = 10 * 60_000;

interface Input {
	settings: AutoTraderSettings | undefined;
	status: AutoTraderStatus | undefined;
	signal: Signal | undefined;
	universe: readonly string[];
	enabled: boolean;
}

export function useAutoForecast({ settings, status, signal, universe, enabled }: Input): {
	forecast: Forecast | null;
	reason: string | null;
} {
	const state = useAllDexsAccountState();
	const markets = useMarkets();
	const mids = useSubscription("allMids", { dex: HL_ALL_DEXS }, { enabled });
	if (!enabled || !settings) return { forecast: null, reason: null };
	const main = state.clearinghouseStates.find(([dex]) => dex === "")?.[1];
	const xyz = state.clearinghouseStates.find(([dex]) => dex === "xyz")?.[1];
	const equity = accountEquity(state.accountAbstraction ?? undefined, main, xyz, { balances: state.spotBalances });
	if (state.isLoading || state.hasError || equity === null)
		return { forecast: null, reason: "Waiting for account equity and positions." };
	const now = Date.now();
	if (!signal?.timestamp || now - signal.timestamp > SIGNAL_MAX_AGE_MS)
		return { forecast: null, reason: "Waiting for a fresh signal." };
	if (!mids.data) return { forecast: null, reason: "Waiting for market prices." };
	const positions: Record<string, number> = {};
	const decimals: Record<string, number> = {};
	for (const [, dex] of state.clearinghouseStates)
		for (const { position } of dex.assetPositions) positions[position.coin] = Number(position.szi);
	for (const coin of universe) {
		const market = markets.getMarket(coin);
		if (market && market.kind !== "spot") decimals[coin] = market.szDecimals;
	}
	const cycleTs = status?.lastCycle ?? status?.plan?.ts;
	const sameDay = cycleTs && new Date(cycleTs).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
	try {
		return {
			forecast: forecastTargets({
				settings,
				signal,
				universe: [...universe],
				equity,
				positions,
				mids: mids.data.mids,
				decimals,
				dayStart: sameDay ? status?.plan?.dayStart : null,
			}),
			reason: null,
		};
	} catch (e) {
		return { forecast: null, reason: e instanceof Error ? e.message : "Forecast unavailable." };
	}
}
