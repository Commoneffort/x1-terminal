// @vitest-environment jsdom
import type { Chart } from "klinecharts";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useChartLinesInput } from "@/components/trade/chart/use-chart-lines-input";
import { useKlineExecutions } from "@/components/trade/chart/use-kline-executions";
import type { ChartLinesInput } from "@/lib/chart/chart-lines";
import { useChartMarksStore } from "@/stores/use-chart-marks-store";

vi.mock("@/hooks/use-trading-account", () => ({ useTradingAccount: () => ({ address: "0x123", isConnected: true }) }));
vi.mock("@/components/trade/chart/use-execution-fills", () => ({
	useExecutionFills: () => [{ coin: "BTC", side: "B", time: 1800000000000, px: "100", sz: "1", tid: 1 }],
}));
vi.mock("@/lib/chart/fill-markers-overlay", () => ({
	FILL_MARKERS_OVERLAY: "fills",
	registerFillMarkersOverlay: vi.fn(),
}));
vi.mock("@/lib/hyperliquid", () => ({
	useMarkets: () => ({ getMarket: () => ({ szDecimals: 4, shortName: "BTC" }) }),
	useUserPositions: () => ({
		getPosition: () => ({ szi: "1", entryPx: "100", liquidationPx: "80", unrealizedPnl: "5" }),
	}),
	useSubscription: (name: string) =>
		name === "openOrders"
			? {
					data: {
						orders: [
							{
								coin: "BTC",
								oid: 7,
								isTrigger: false,
								limitPx: "110",
								sz: "1",
								side: "A",
								orderType: "Limit",
								reduceOnly: false,
							},
						],
					},
				}
			: { data: { mids: { BTC: "105" } } },
}));

it("removes executions, position, liquidation and order lines while hidden and restores them", async () => {
	useChartMarksStore.setState({ hidden: false });
	const bar = { timestamp: 1800000000000, open: 100, high: 101, low: 99, close: 100 };
	const chart = { createOverlay: vi.fn(), removeOverlay: vi.fn(), getDataList: () => [bar] };
	const ref = { current: chart as unknown as Chart };
	let input: ChartLinesInput | null = null;
	function Harness() {
		useKlineExecutions(ref, "BTC", 60000, "BTC:1m");
		input = useChartLinesInput("BTC");
		return null;
	}
	const root = createRoot(document.createElement("div"));
	await act(async () => root.render(createElement(Harness)));
	expect(chart.createOverlay).toHaveBeenCalledTimes(1);
	expect(input!.lines.map((l) => l.kind).sort()).toEqual(["limit", "liquidation", "position"]);

	await act(async () => useChartMarksStore.setState({ hidden: true }));
	expect(chart.removeOverlay).toHaveBeenCalledWith({ name: "fills" });
	expect(chart.createOverlay).toHaveBeenCalledTimes(1);
	expect(input!.lines).toEqual([]);

	await act(async () => useChartMarksStore.setState({ hidden: false }));
	expect(chart.createOverlay).toHaveBeenCalledTimes(2);
	expect(input!.lines).toHaveLength(3);
	await act(async () => root.unmount());
});
