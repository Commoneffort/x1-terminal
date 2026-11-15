import { SegmentedControlItem, SegmentedControls } from "@hypeterminal/ui";
import { useAutoTrader } from "@/hooks/use-auto-trader";
import { phaseTone } from "@/lib/auto-trader/phase";
import { setTradeMode, type TradeMode } from "@/stores/use-trade-mode-store";
import { AutoStatusDot } from "./auto-status-dot";

interface Props {
	mode: TradeMode;
}

export function TradeModeSwitch({ mode }: Props) {
	const auto = useAutoTrader();
	const tone = auto.available && auto.phase !== "setup" ? phaseTone(auto.phase) : null;
	function handleChange(value: string) {
		if (value === "manual" || value === "auto") setTradeMode(value);
	}
	return (
		<div className="px-3 pt-3">
			<SegmentedControls value={mode} onValueChange={handleChange} fullWidth>
				<SegmentedControlItem value="manual">Manual</SegmentedControlItem>
				<SegmentedControlItem value="auto">
					<span className="inline-flex items-center gap-1.5">
						{tone && <AutoStatusDot tone={tone} />}
						Auto
					</span>
				</SegmentedControlItem>
			</SegmentedControls>
		</div>
	);
}
