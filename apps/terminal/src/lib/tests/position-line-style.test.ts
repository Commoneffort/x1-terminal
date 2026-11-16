import { expect, it } from "vitest";
import { labelWidth, leftOffsets, positionLineStyle } from "@/lib/chart/position-line-style";
import type { TradingLine } from "@/lib/chart/trading-lines";

const base = { id: "x", label: "", tone: "down" as const };
const colors = { color: "#ff0000", page: "#000000", fg: "#ffffff" };

it("labels lines like the default chart view", () => {
	const short: TradingLine = { ...base, kind: "position", title: "Short", qty: "0.132", pnl: -0.78, price: 65000 };
	expect(positionLineStyle(short, colors)).toMatchObject({ body: "PNL -$0.78", qty: "-0.132", text: "#ffffff" });
	const liq: TradingLine = { ...base, kind: "liquidation", title: "Liq.", price: 69.656 };
	expect(positionLineStyle(liq, colors)).toMatchObject({ body: "Liq. 69.656", qty: "" });
	const order: TradingLine = { ...base, kind: "order", title: "Limit Buy", qty: "0.002", price: 64000 };
	expect(positionLineStyle(order, colors)).toMatchObject({ body: "Limit Buy", qty: "0.002" });
});

it("fills the label with the line color", () => {
	const line: TradingLine = { ...base, kind: "position", title: "Long", qty: "1", pnl: 2, price: 1 };
	expect(positionLineStyle(line, colors).fill).toBe("#e00000");
});

it("places close labels side by side from the left edge", () => {
	const widths = [100, 80, 60, 50];
	expect(leftOffsets([100, 100.5, 101, 150], widths, 4)).toEqual([8, 114, 200, 8]);
	expect(leftOffsets([100, 150], [100, 80], 4)).toEqual([8, 8]);
});

it("measures the label with its size segment", () => {
	expect(labelWidth({ body: "abc", qty: "" }, (t) => t.length * 10)).toBe(46);
	expect(labelWidth({ body: "abc", qty: "12" }, (t) => t.length * 10)).toBe(82);
});
