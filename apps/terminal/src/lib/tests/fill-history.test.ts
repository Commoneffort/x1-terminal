import { describe, expect, it, vi } from "vitest";
import {
	HISTORY_DAY_MS,
	type HistoryFill,
	loadDayFills,
	loadFillsForward,
	mergeHistoryFills,
} from "../trade/fill-history";

const fill = (tid: number, time: number) => ({ tid, time, coin: "BTC", hash: `0x${tid}` }) as HistoryFill;
describe("24-hour fill history", () => {
	it("loads the full day and preserves more than 200 fills", async () => {
		const now = HISTORY_DAY_MS * 2;
		const rows = Array.from({ length: 350 }, (_, i) => fill(i, now - i));
		const result = await loadDayFills(async (start, end) => {
			expect(start).toBe(now - HISTORY_DAY_MS);
			expect(end).toBe(now);
			return rows;
		}, now);
		expect(result.fills).toHaveLength(350);
		expect(result.limited).toBe(false);
	});
	it("splits full pages without losing fills at inclusive boundaries", async () => {
		const now = HISTORY_DAY_MS;
		const rows = Array.from({ length: 2501 }, (_, i) => fill(i, i));
		const result = await loadDayFills(
			async (start, end) => rows.filter((row) => row.time >= start && row.time <= end).slice(0, 2000),
			now,
		);
		expect(result.fills).toHaveLength(2501);
		expect(result.limited).toBe(false);
	});
	it("deduplicates snapshot/live overlap and sorts newest first", () => {
		expect(mergeHistoryFills([fill(1, 10), fill(2, 20)], [fill(2, 20), fill(3, 30)]).map((row) => row.tid)).toEqual([
			3, 2, 1,
		]);
	});
	it("warns rather than claiming completeness for saturated single timestamps", async () => {
		const rows = Array.from({ length: 2000 }, (_, i) => fill(i, 0));
		const result = await loadDayFills(async (start, end) => (start === 0 && end >= 0 ? rows : []), HISTORY_DAY_MS);
		expect(result.limited).toBe(true);
	});
	it("propagates API failures instead of returning an empty successful cache", async () => {
		await expect(
			loadDayFills(async () => {
				throw new Error("offline");
			}, HISTORY_DAY_MS),
		).rejects.toThrow("offline");
	});
});

describe("loadFillsForward", () => {
	it("pages forward from the last fill time and dedupes the shared millisecond", async () => {
		const first = Array.from({ length: 2000 }, (_, i) => fill(i, 1000 + Math.floor(i / 2)));
		const second = [fill(1998, 1999), fill(1999, 1999), fill(5000, 2500)];
		const fetchPage = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
		const result = await loadFillsForward(fetchPage, 3000, 1000);
		expect(fetchPage.mock.calls).toEqual([
			[1000, 3000],
			[1999, 3000],
		]);
		expect(result.fills).toHaveLength(2001);
		expect(result.limited).toBe(false);
	});

	it("stops and reports a limit when a full page does not advance", async () => {
		const stuck = Array.from({ length: 2000 }, (_, i) => fill(i, 1000));
		const fetchPage = vi.fn().mockResolvedValue(stuck);
		const result = await loadFillsForward(fetchPage, 3000, 1000);
		expect(fetchPage).toHaveBeenCalledTimes(1);
		expect(result.limited).toBe(true);
	});
});
