import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useAutoTrader } from "@/hooks/use-auto-trader";
import { isTrading, PHASE_SHORT_LABEL } from "@/lib/auto-trader/phase";
import { cn } from "@/lib/cn";
import { useGlobalSettingsActions } from "@/stores/use-global-settings-store";
import { setTradeMode } from "@/stores/use-trade-mode-store";
import { AutoStartModal } from "./auto-start-modal";

export function AutoModePill() {
	const auto = useAutoTrader();
	const { setMobileActiveTab } = useGlobalSettingsActions();
	const [starting, setStarting] = useState(false);
	if (!auto.available || auto.phase === "setup") return null;
	const { phase } = auto;
	const trading = isTrading(phase);
	const live = phase === "active" || phase === "waiting";

	function open() {
		setTradeMode("auto");
		setMobileActiveTab("trade");
	}

	function toggle() {
		if (trading) void auto.pause();
		else setStarting(true);
	}

	return (
		<>
			<div className="flex h-7 shrink-0 items-stretch gap-px overflow-hidden rounded-8 text-xs">
				<button
					type="button"
					onClick={open}
					className="flex items-center gap-1.5 bg-control px-2.5 whitespace-nowrap text-fg-secondary hover:bg-control-hover"
				>
					Auto
					<span className={cn(live ? "text-market-up" : "text-fg", phase === "stopped" && "text-market-down")}>
						{PHASE_SHORT_LABEL[phase]}
					</span>
				</button>
				<button
					type="button"
					onClick={toggle}
					disabled={phase === "closing" || auto.pending !== null}
					aria-label={trading ? "Pause Auto Trader" : "Start Auto Trader"}
					className="flex w-7 items-center justify-center bg-control text-fg-secondary hover:bg-control-hover hover:text-fg disabled:opacity-40"
				>
					{trading ? <PauseIcon weight="fill" className="size-3" /> : <PlayIcon weight="fill" className="size-3" />}
				</button>
			</div>
			{auto.settings && (
				<AutoStartModal
					open={starting}
					settings={auto.settings}
					marketCount={auto.markets.length}
					onCancel={() => setStarting(false)}
					onConfirm={() => {
						setStarting(false);
						void auto.start();
					}}
				/>
			)}
		</>
	);
}
