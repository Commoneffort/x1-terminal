import { describe, expect, it } from "vitest";
import { autoTraderPhase, managesMarket, withoutMarket } from "@/lib/auto-trader/phase";
import type { AutoTraderSettings, AutoTraderStatus } from "@/lib/auto-trader/types";

const settings: AutoTraderSettings = { leverage: 3, killPct: 0.1, include: null, exclude: [], minOrderUsd: 10 };
const base: AutoTraderStatus = { registered: true, hasKey: true, state: "active", lastCycle: 1 };

describe("autoTraderPhase", () => {
	it("maps service status to a phase", () => {
		expect(autoTraderPhase(undefined)).toBe("setup");
		expect(autoTraderPhase({ registered: true, hasKey: false })).toBe("setup");
		expect(autoTraderPhase({ ...base, state: "paused" })).toBe("paused");
		expect(autoTraderPhase({ ...base, state: "flatten-requested" })).toBe("closing");
		expect(autoTraderPhase({ ...base, plan: { ts: 1, killed: true } })).toBe("stopped");
		expect(autoTraderPhase({ ...base, lastCycle: undefined })).toBe("waiting");
		expect(autoTraderPhase(base)).toBe("active");
	});
});

describe("market ownership", () => {
	const universe = ["BTC", "ETH", "xyz:GOLD"];
	it("detects managed markets, including builder markets", () => {
		expect(managesMarket(settings, universe, "BTC")).toBe(true);
		expect(managesMarket(settings, universe, "xyz:GOLD")).toBe(true);
		expect(managesMarket({ ...settings, include: ["ETH"] }, universe, "BTC")).toBe(false);
	});
	it("removes one market and keeps the rest", () => {
		const include = withoutMarket(settings, universe, "BTC").include;
		expect(include).not.toContain("BTC");
		expect(include).toEqual(expect.arrayContaining(["ETH", "xyz:GOLD"]));
	});
});
