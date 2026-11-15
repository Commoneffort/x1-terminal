import { zeroAddress } from "viem";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { useAutoTraderSignal, useAutoTraderStatus } from "@/lib/auto-trader/hooks";
import { autoTraderPhase, isTrading, managesMarket } from "@/lib/auto-trader/phase";
import { useHyperliquid } from "@/lib/hyperliquid";

export function useAutoManaged() {
	const { address, isConnected } = useTradingAccount();
	const { env } = useHyperliquid();
	const available = env === "Mainnet" && isConnected && !!address;
	const status = useAutoTraderStatus(address ?? zeroAddress, available);
	const signal = useAutoTraderSignal(available);
	const phase = autoTraderPhase(status.data);
	const universe = [...new Set(signal.data?.coins.map((c) => c.coin) ?? [])];
	const settings = status.data?.settings;
	const active = available && isTrading(phase);
	return {
		registered: available && phase !== "setup",
		isManaged: (coin: string) => active && managesMarket(settings, universe, coin),
	};
}
