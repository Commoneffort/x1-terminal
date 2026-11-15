import { expect, it } from "vitest";
import { positionLineStyle, staggerOffsets } from "@/lib/chart/position-line-style";
import type { TradingLine } from "@/lib/chart/trading-lines";

const base = { id: "x", label: "", tone: "down" as const };

it("labels position, liquidation and order lines like TradingView", () => {
	const short: TradingLine = { ...base, kind: "position", title: "Short", qty: "0.132", pnl: -73.07, price: 65000 };
	expect(positionLineStyle(short, "#f00", "#000", 0)).toMatchObject({ body: "-73.07 USD", qty: "-0.132", length: 12 });
	const liq: TradingLine = { ...base, kind: "liquidation", title: "Liq.", price: 80000 };
	expect(positionLineStyle(liq, "#f00", "#000", 0)).toMatchObject({ body: "Liquidation", qty: "" });
	const order: TradingLine = { ...base, kind: "order", title: "Limit Buy", qty: "0.002", price: 64000 };
	expect(positionLineStyle(order, "#0f0", "#000", 1)).toMatchObject({ body: "Limit Buy", qty: "0.002", length: 40 });
});

it("shifts labels that sit close together on screen", () => {
	expect(staggerOffsets([100, 100.5, 101, 150], 100)).toEqual([0, 1, 2, 0]);
	expect(staggerOffsets([100, 150], 100)).toEqual([0, 0]);
});
