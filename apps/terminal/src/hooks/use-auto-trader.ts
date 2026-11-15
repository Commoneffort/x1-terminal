import { useState } from "react";
import { zeroAddress } from "viem";
import { useConnection } from "wagmi";
import { AUTO_TRADER_BUILDER, AUTO_TRADER_MIN_EQUITY } from "@/config/auto-trader";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { useAutoTraderMutation, useAutoTraderSignal, useAutoTraderStatus } from "@/lib/auto-trader/hooks";
import { autoTraderPhase } from "@/lib/auto-trader/phase";
import { accountEquity, allowedMarkets, validateSettings } from "@/lib/auto-trader/targets";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
import { useHyperliquid, useInfo } from "@/lib/hyperliquid";

type Op = "start" | "pause" | "settings";

export function useAutoTrader() {
	const { address: owner } = useConnection();
	const { address, isConnected } = useTradingAccount();
	const { env } = useHyperliquid();
	const master = address ?? zeroAddress;
	const available = env === "Mainnet" && isConnected && !!address;
	const status = useAutoTraderStatus(master, available);
	const signal = useAutoTraderSignal(available);
	const control = useAutoTraderMutation(master);
	const lazy = { enabled: false };
	const agents = useInfo("extraAgents", { user: owner ?? zeroAddress }, lazy);
	const fee = useInfo("maxBuilderFee", { user: owner ?? zeroAddress, builder: AUTO_TRADER_BUILDER }, lazy);
	const main = useInfo("clearinghouseState", { user: master }, lazy);
	const xyz = useInfo("clearinghouseState", { user: master, dex: "xyz" }, lazy);
	const spot = useInfo("spotClearinghouseState", { user: master }, lazy);
	const mode = useInfo("userAbstraction", { user: master }, lazy);
	const [pending, setPending] = useState<Op | null>(null);
	const [error, setError] = useState<string | null>(null);

	const universe = signal.isError ? [] : [...new Set(signal.data?.coins.map((c) => c.coin) ?? [])];
	const settings = status.data?.settings;
	const phase = autoTraderPhase(status.data);
	const markets = settings ? allowedMarkets(settings, universe) : [];

	async function verifyReady() {
		const current = await status.refetch();
		if (current.isError || !current.data?.registered || !current.data.hasKey)
			throw new Error("Auto Trader is not registered for this account.");
		const [a, f, m, x, s, ab] = await Promise.all([
			agents.refetch(),
			fee.refetch(),
			main.refetch(),
			xyz.refetch(),
			spot.refetch(),
			mode.refetch(),
		]);
		if ([a, f, m, x, s, ab].some((q) => q.isError)) throw new Error("Could not check the account. Try again.");
		const agent = current.data.agent?.toLowerCase();
		if (!a.data?.some((row) => row.address.toLowerCase() === agent && row.validUntil > Date.now()))
			throw new Error("The Auto Trader API wallet expired. Renew it on the API page.");
		if (f.data === undefined || f.data < 50) throw new Error("Approve the 0.05% builder fee first.");
		const equity = accountEquity(ab.data, m.data, x.data, s.data);
		if (equity === null || equity < AUTO_TRADER_MIN_EQUITY)
			throw new Error(`Auto Trader needs at least $${AUTO_TRADER_MIN_EQUITY} in account equity.`);
		const saved = current.data.settings ?? settings;
		if (saved) validateSettings(saved, universe);
	}

	async function run(op: Op, job: () => Promise<unknown>) {
		if (pending) return;
		setPending(op);
		setError(null);
		try {
			await job();
			await status.refetch();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Auto Trader request failed. Try again.");
		} finally {
			setPending(null);
		}
	}

	function start() {
		return run("start", async () => {
			await verifyReady();
			await control.mutateAsync({ action: "resume", body: {} });
		});
	}

	function pause() {
		return run("pause", () => control.mutateAsync({ action: "pause", body: {} }));
	}

	function saveSettings(next: AutoTraderSettings) {
		return run("settings", async () => {
			validateSettings(next, universe);
			await control.mutateAsync({ action: "settings", body: { ...next, exclude: next.exclude ?? [] } });
		});
	}

	return {
		available,
		env,
		phase,
		status: status.data,
		loading: available && status.isLoading,
		statusError: status.isError,
		settings,
		universe,
		markets,
		pending,
		error,
		clearError: () => setError(null),
		start,
		pause,
		saveSettings,
	};
}
