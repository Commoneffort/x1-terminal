import { useAutoTrader } from "@/hooks/use-auto-trader";
import { isTrading } from "@/lib/auto-trader/phase";
import { cn } from "@/lib/cn";
import { setTradeMode, type TradeMode } from "@/stores/use-trade-mode-store";

interface Props {
	mode: TradeMode;
}

type Phase = "active" | "paused" | null;

export function TradeModeSwitch({ mode }: Props) {
	const auto = useAutoTrader();
	let phase: Phase = null;
	if (auto.available && auto.phase !== "setup") phase = isTrading(auto.phase) ? "active" : "paused";
	return (
		<div className="flex bg-background">
			{(["manual", "auto"] as const).map((m) => {
				const on = mode === m;
				return (
					<button
						key={m}
						type="button"
						onClick={() => setTradeMode(m)}
						className={cn(
							"flex h-10 flex-1 items-center justify-center gap-2 rounded-t-8 text-sm transition-colors",
							on ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg",
						)}
					>
						{m === "manual" ? "Manual" : "Auto"}
						{m === "auto" && phase && (
							<span
								className={cn(
									"rounded-full px-1.5 py-px text-2xs",
									phase === "active" ? "bg-success-soft text-market-up" : "bg-control text-fg-muted",
								)}
							>
								{phase === "active" ? "Live" : "Paused"}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
