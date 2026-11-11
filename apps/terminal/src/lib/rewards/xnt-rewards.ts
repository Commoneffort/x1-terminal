import Big from "big.js";
import type { HistoryFill } from "@/lib/trade/fill-history";

const DAY_MS = 24 * 60 * 60 * 1000;
export const REWARD_DAYS = 14;

export interface RewardFill {
	coin: string;
	dir: string;
	time: number;
	fee: string;
	tid: number;
}

export interface RewardSummary {
	total: string;
	day: string;
	week: string;
	trades: number;
	since: number | null;
	daily: string[];
	recent: RewardFill[];
}

function parsePrice(raw: string | undefined) {
	if (!raw) return null;
	const price = Number(raw);
	return Number.isFinite(price) && price > 0 ? raw : null;
}

export const XNT_PRICE_USD = parsePrice(import.meta.env.VITE_XNT_PRICE_USD?.trim());

export function feesToXnt(fees: string, price: string | null = XNT_PRICE_USD) {
	if (!price) return null;
	return Big(fees).div(price).toString();
}

export function summarizeRewards(fills: readonly HistoryFill[], now: number): RewardSummary {
	let total = Big(0);
	let day = Big(0);
	let week = Big(0);
	let since: number | null = null;
	const daily = Array.from({ length: REWARD_DAYS }, () => Big(0));
	const recent: RewardFill[] = [];
	const today = Math.floor(now / DAY_MS);
	for (const fill of fills) {
		if (!fill.builderFee || Big(fill.builderFee).lte(0)) continue;
		const fee = Big(fill.builderFee);
		total = total.plus(fee);
		if (fill.time >= now - DAY_MS) day = day.plus(fee);
		if (fill.time >= now - 7 * DAY_MS) week = week.plus(fee);
		const slot = REWARD_DAYS - 1 - (today - Math.floor(fill.time / DAY_MS));
		if (slot >= 0 && slot < REWARD_DAYS) daily[slot] = daily[slot].plus(fee);
		since = since === null ? fill.time : Math.min(since, fill.time);
		recent.push({ coin: fill.coin, dir: fill.dir, time: fill.time, fee: fill.builderFee, tid: fill.tid });
	}
	recent.sort((a, b) => b.time - a.time);
	return {
		total: total.toString(),
		day: day.toString(),
		week: week.toString(),
		trades: recent.length,
		since,
		daily: daily.map((d) => d.toString()),
		recent: recent.slice(0, 25),
	};
}

export function feeDecimals(value: string) {
	const n = Math.abs(Number(value));
	if (n === 0 || n >= 1) return 2;
	if (n >= 0.01) return 3;
	return 4;
}

export function barHeights(daily: readonly string[]) {
	const max = Math.max(...daily.map(Number));
	return daily.map((d) => (max > 0 ? Number(d) / max : 0));
}
