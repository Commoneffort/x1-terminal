import type { TradingLine } from "./trading-lines";

export const LABEL_HEIGHT = 22;
export const LEFT_INSET = 8;
const LABEL_GAP = 6;
const LABEL_PADDING = 16;

export const LABEL_FONT = "500 11px Inter, sans-serif";

export interface PositionLineStyle {
	body: string;
	qty: string;
	color: string;
	fill: string;
	text: string;
	surface: string;
	fg: string;
}

export interface LineColors {
	color: string;
	page: string;
	fg: string;
}

function signedQty(line: TradingLine) {
	if (!line.qty) return "";
	return line.kind === "position" && line.title === "Short" ? `-${line.qty}` : line.qty;
}

function money(value: number) {
	return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

function body(line: TradingLine) {
	if (line.kind === "liquidation") return `Liq. ${line.price}`;
	if (line.kind === "order") return line.title;
	if (line.pnl === undefined) return line.title;
	return `PNL ${money(line.pnl)}`;
}

export function mixHex(a: string, b: string, t: number): string {
	const pa = Number.parseInt(a.slice(1, 7), 16);
	const pb = Number.parseInt(b.slice(1, 7), 16);
	const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
	return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

export function labelWidth(style: Pick<PositionLineStyle, "body" | "qty">, measure: (text: string) => number) {
	const qty = style.qty ? measure(style.qty) + LABEL_PADDING : 0;
	return measure(style.body) + LABEL_PADDING + qty;
}

export function leftOffsets(prices: readonly number[], widths: readonly number[], minGap: number): number[] {
	const order = prices.map((price, index) => ({ price, index })).sort((a, b) => a.price - b.price);
	const lefts = new Array<number>(prices.length).fill(LEFT_INSET);
	for (let i = 1; i < order.length; i++) {
		const prev = order[i - 1];
		const cur = order[i];
		if (Math.abs(cur.price - prev.price) < minGap) {
			lefts[cur.index] = lefts[prev.index] + widths[prev.index] + LABEL_GAP;
		}
	}
	return lefts;
}

export function positionLineStyle(line: TradingLine, colors: LineColors): PositionLineStyle {
	return {
		body: body(line),
		qty: line.kind === "liquidation" ? "" : signedQty(line),
		color: colors.color,
		fill: mixHex(colors.color, colors.page, 0.12),
		text: colors.fg,
		surface: colors.page,
		fg: colors.fg,
	};
}

let measureCtx: CanvasRenderingContext2D | null = null;

export function measureLabel(text: string): number {
	if (typeof document === "undefined") return text.length * 6.6;
	measureCtx ??= document.createElement("canvas").getContext("2d");
	if (!measureCtx) return text.length * 6.6;
	measureCtx.font = LABEL_FONT;
	return measureCtx.measureText(text).width;
}
