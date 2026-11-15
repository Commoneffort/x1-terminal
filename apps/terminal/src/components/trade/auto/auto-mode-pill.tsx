import { useAutoTrader } from "@/hooks/use-auto-trader";
import { PHASE_LABEL, phaseTone } from "@/lib/auto-trader/phase";
import { setTradeMode } from "@/stores/use-trade-mode-store";
import { AutoStatusDot } from "./auto-status-dot";

export function AutoModePill() {
	const auto = useAutoTrader();
	if (!auto.available || auto.phase === "setup") return null;
	return (
		<button
			type="button"
			onClick={() => setTradeMode("auto")}
			className="flex shrink-0 items-center gap-2 rounded-8 px-2 py-1 transition-colors hover:bg-fill-hover"
		>
			<AutoStatusDot tone={phaseTone(auto.phase)} />
			<span className="text-left">
				<span className="block text-2xs tracking-micro text-fg-muted uppercase">Auto</span>
				<span className="block text-xs">{PHASE_LABEL[auto.phase]}</span>
			</span>
		</button>
	);
}
