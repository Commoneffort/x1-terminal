import { useQuery } from "@tanstack/react-query";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { useHyperliquid } from "@/lib/hyperliquid";
import { getNetwork } from "@/lib/network";
import { summarizeRewards } from "@/lib/rewards/xnt-rewards";
import { loadDayFills } from "@/lib/trade/fill-history";

export function useXntRewards(enabled = true) {
	const { address, isConnected } = useTradingAccount();
	const { info } = useHyperliquid();
	const active = enabled && isConnected && !!address;
	return useQuery({
		queryKey: ["xnt-rewards-v1", getNetwork(), address?.toLowerCase()],
		enabled: active,
		staleTime: 60_000,
		refetchInterval: 120_000,
		queryFn: async ({ signal }) => {
			const now = Date.now();
			const { fills, limited } = await loadDayFills(
				(startTime, endTime) => info.userFillsByTime({ user: address!, startTime, endTime }, signal),
				now,
				0,
			);
			return { ...summarizeRewards(fills, now), limited };
		},
	});
}
