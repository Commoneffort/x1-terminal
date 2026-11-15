import type { TradingLine } from "./trading-lines";

const CLOSE_SHARE = 0.08;
const BASE_LENGTH = 12;
const STAGGER_STEP = 28;

export interface PositionLineStyle {
	body: string;
	qty: string;
	length: number;
	color: string;
	surface: string;
}

function signedQty(line: TradingLine) {
	if (!line.qty) return "";
	return line.kind === "position" && line.title === "Short" ? `-${line.qty}` : line.qty;
}

function body(line: TradingLine) {
	if (line.kind === "liquidation") return "Liquidation";
	if (line.kind === "order") return line.title;
	if (line.pnl === undefined) return line.title;
	return `${line.pnl >= 0 ? "+" : ""}${line.pnl.toFixed(2)} USD`;
}

export function staggerOffsets(prices: readonly number[], visibleRange: number | null) {
	const sorted = [...prices].sort((a, b) => a - b);
	const span = visibleRange && visibleRange > 0 ? visibleRange : (sorted.at(-1) ?? 0) - (sorted[0] ?? 0) || 1;
	const order = prices.map((price, index) => ({ price, index })).sort((a, b) => a.price - b.price);
	const offsets = new Array<number>(prices.length).fill(0);
	for (let i = 1; i < order.length; i++) {
		const prev = order[i - 1];
		const cur = order[i];
		if (Math.abs(cur.price - prev.price) / span < CLOSE_SHARE) offsets[cur.index] = offsets[prev.index] + 1;
	}
	return offsets;
}

export function positionLineStyle(
	line: TradingLine,
	color: string,
	surface: string,
	offset: number,
): PositionLineStyle {
	return {
		body: body(line),
		qty: line.kind === "liquidation" ? "" : signedQty(line),
		length: BASE_LENGTH + offset * STAGGER_STEP,
		color,
		surface,
	};
}
