import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { useHyperliquid, useSubscription } from "@/lib/hyperliquid";
import { getNetwork } from "@/lib/network";
import {
	HISTORY_DAY_MS,
	type HistoryFill,
	loadDayFills,
	loadFillsForward,
	mergeHistoryFills,
} from "@/lib/trade/fill-history";

/** Account fills for the last `windowMs` (24 hours by default), from history plus the live feed. */
export function useTradeHistory(aggregate = false, windowMs = HISTORY_DAY_MS) {
	const { address, isConnected } = useTradingAccount();
	const { info } = useHyperliquid();
	const network = getNetwork();
	const enabled = isConnected && !!address;
	const live = useSubscription("userFills", { user: address ?? "0x0", aggregateByTime: aggregate }, { enabled });
	const client = useQueryClient();
	const cacheName = windowMs === HISTORY_DAY_MS ? "trade-history-24h-v1" : `trade-history-${windowMs}-v1`;
	const queryKey = ["persisted", cacheName, network, address?.toLowerCase(), aggregate];
	type CachedHistory = { fills: HistoryFill[]; limited: boolean; through?: number; from?: number };
	const history = useQuery<CachedHistory>({
		queryKey,
		enabled,
		staleTime: 30_000,
		gcTime: HISTORY_DAY_MS,
		refetchInterval: 60_000,
		queryFn: async ({ signal }) => {
			const now = Date.now();
			const from = now - windowMs;
			const cached = client.getQueryData<CachedHistory>(queryKey);
			// Overlap the last minute to catch fills near the previous fetch boundary.
			const incremental =
				cached?.through !== undefined && cached.from !== undefined && cached.from <= from && cached.through >= from;
			const start = incremental ? Math.max(from, cached.through! - 60_000) : from;
			const load = windowMs > HISTORY_DAY_MS ? loadFillsForward : loadDayFills;
			const result = await load(
				(startTime, endTime) =>
					info.userFillsByTime({ user: address!, startTime, endTime, aggregateByTime: aggregate }, signal),
				now,
				start,
			);
			return {
				fills: mergeHistoryFills(incremental ? cached.fills : [], result.fills).filter((fill) => fill.time >= from),
				limited: result.limited || !!(incremental && cached.limited),
				from,
				through: now,
			};
		},
	});
	const fills = useMemo(() => {
		const liveFills = live.data && live.data.user.toLowerCase() === address?.toLowerCase() ? live.data.fills : [];
		return enabled
			? mergeHistoryFills(history.data?.fills ?? [], liveFills).filter((fill) => fill.time >= Date.now() - windowMs)
			: [];
	}, [enabled, address, history.data, live.data, windowMs]);
	return {
		fills,
		status: history.isPending && !fills.length ? "subscribing" : "active",
		error: history.error,
		warning: history.error
			? "Could not refresh the full 24-hour history. Showing available cached and live trades."
			: history.data?.limited
				? "Hyperliquid history limit reached; the full 24 hours may not be available."
				: null,
		loading: history.isFetching,
	};
}
