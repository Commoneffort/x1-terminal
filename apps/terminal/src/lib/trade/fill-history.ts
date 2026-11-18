import type { InfoResponse } from "@/lib/hyperliquid";
export type HistoryFill = InfoResponse<"userFillsByTime">[number];
export const HISTORY_DAY_MS = 24 * 60 * 60 * 1000;
export function mergeHistoryFills(...groups: readonly HistoryFill[][]): HistoryFill[] {
	const rows = new Map<string, HistoryFill>();
	for (const group of groups) for (const fill of group) rows.set(`${fill.coin}:${fill.tid}:${fill.hash}`, fill);
	return [...rows.values()].sort((a, b) => b.time - a.time);
}
/** Split saturated windows so inclusive timestamp boundaries never skip fills. */
export async function loadDayFills(
	fetchPage: (startTime: number, endTime: number) => Promise<HistoryFill[]>,
	now: number,
	startTime = now - HISTORY_DAY_MS,
): Promise<{ fills: HistoryFill[]; limited: boolean }> {
	let requests = 0;
	let limited = false;
	const visit = async (start: number, end: number): Promise<HistoryFill[]> => {
		if (++requests > 80) throw new Error("Trade history request limit reached. Retry to load the full day.");
		const page = await fetchPage(start, end);
		if (page.length < 2000) return page;
		if (start === end) {
			limited = true;
			return page;
		}
		const middle = Math.floor((start + end) / 2);
		const left = await visit(start, middle);
		const right = await visit(middle + 1, end);
		return mergeHistoryFills(left, right);
	};
	const fills = mergeHistoryFills(await visit(startTime, now));
	// Hyperliquid exposes only the latest 10,000 fills for an address.
	if (fills.length >= 10000) limited = true;
	return { fills, limited };
}

/**
 * Page forward from `startTime`. Hyperliquid returns the oldest 2,000 fills of a window, so each
 * page starts at the last fill time it saw. Pages overlap on that millisecond and are deduped.
 * Hyperliquid keeps at most the latest 10,000 fills, so this needs at most a few requests.
 */
export async function loadFillsForward(
	fetchPage: (startTime: number, endTime: number) => Promise<HistoryFill[]>,
	now: number,
	startTime: number,
	maxRequests = 8,
): Promise<{ fills: HistoryFill[]; limited: boolean }> {
	let fills: HistoryFill[] = [];
	let start = startTime;
	for (let request = 0; request < maxRequests; request++) {
		const page = await fetchPage(start, now);
		fills = mergeHistoryFills(fills, page);
		if (page.length < 2000) return { fills, limited: fills.length >= 10000 };
		const last = Math.max(...page.map((fill) => fill.time));
		if (last <= start) return { fills, limited: true };
		start = last;
	}
	return { fills, limited: true };
}
