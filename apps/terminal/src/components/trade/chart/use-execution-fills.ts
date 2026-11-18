import { useTradeHistory } from "@/hooks/use-trade-history";
import type { ExecutionFill } from "@/lib/chart/execution-markers";
import { HISTORY_DAY_MS } from "@/lib/trade/fill-history";

/** Fills stay on the chart for 30 days, so markers of a position held past 24 hours remain visible. */
export const CHART_FILL_WINDOW_MS = 30 * HISTORY_DAY_MS;

export function useExecutionFills(): readonly ExecutionFill[] {
	return useTradeHistory(false, CHART_FILL_WINDOW_MS).fills;
}
