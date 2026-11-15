import { EXECUTOR_MARKETS } from "./targets";

export function marketSupportNote(coin: string, signalMarkets: readonly string[]) {
	if (!signalMarkets.includes(coin)) return "Awaiting signal";
	if (!(EXECUTOR_MARKETS as readonly string[]).includes(coin)) return "Executor support pending";
	return null;
}
