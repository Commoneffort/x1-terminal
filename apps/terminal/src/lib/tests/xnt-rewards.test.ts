import { describe, expect, it } from "vitest";
import { barHeights, feesToXnt, summarizeRewards } from "@/lib/rewards/xnt-rewards";
import type { HistoryFill } from "@/lib/trade/fill-history";

const DAY = 86_400_000;
const now = 100 * DAY + 1000;
const fill = (time: number, builderFee: string | undefined, tid: number) =>
	({ coin: "BTC", dir: "Open Long", time, builderFee, tid }) as unknown as HistoryFill;

describe("summarizeRewards", () => {
	it("sums builder fees by window and skips fills without one", () => {
		const s = summarizeRewards(
			[
				fill(now - 1000, "0.1", 1),
				fill(now - 3 * DAY, "0.25", 2),
				fill(now - 20 * DAY, "1", 3),
				fill(now, undefined, 4),
			],
			now,
		);
		expect(s.total).toBe("1.35");
		expect(s.day).toBe("0.1");
		expect(s.week).toBe("0.35");
		expect(s.trades).toBe(3);
		expect(s.daily.at(-1)).toBe("0.1");
		expect(s.daily.at(-4)).toBe("0.25");
		expect(s.recent.map((r) => r.tid)).toEqual([1, 2, 3]);
	});

	it("converts fees to XNT only when a price exists", () => {
		expect(feesToXnt("2", "0.5")).toBe("4");
		expect(feesToXnt("2", null)).toBeNull();
	});

	it("scales bars to the largest day", () => {
		expect(barHeights(["0", "1", "2"])).toEqual([0, 0.5, 1]);
	});
});
