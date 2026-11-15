import { Button } from "@hypeterminal/ui";
import { ArrowUpRightIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { useAutoTrader } from "@/hooks/use-auto-trader";
import { cycleTiming } from "@/lib/auto-trader/cycle-timing";
import { isTrading, PHASE_LABEL, phaseTone } from "@/lib/auto-trader/phase";
import { formatUSD } from "@/lib/format";
import { getValueColorClass } from "@/lib/ui/value-color";
import { AutoSettingsForm } from "./auto-settings-form";
import { AutoSetup } from "./auto-setup";
import { AutoStartModal } from "./auto-start-modal";
import { AutoStatusDot } from "./auto-status-dot";

const SETTINGS_URL = "/API#auto-trader";

export function AutoTradePanel() {
	const auto = useAutoTrader();
	if (auto.env !== "Mainnet")
		return <AutoNote text="Auto Trader runs on Mainnet only. Switch the network to use it." />;
	if (!auto.available) return <AutoNote text="Connect a wallet to use Auto Trader." />;
	if (auto.loading) return <AutoNote text="Loading Auto Trader…" />;
	if (auto.statusError && !auto.status) return <AutoNote text="Auto Trader status is unavailable. Try again soon." />;
	if (auto.phase === "setup") return <AutoSetup />;
	return <AutoControls auto={auto} />;
}

function AutoNote({ text }: { text: string }) {
	return <p className="px-3 py-6 text-center text-xs text-fg-muted">{text}</p>;
}

function useNow(active: boolean) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!active) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [active]);
	return now;
}

function AutoControls({ auto }: { auto: ReturnType<typeof useAutoTrader> }) {
	const [confirming, setConfirming] = useState(false);
	const status = auto.status;
	const trading = isTrading(auto.phase);
	const now = useNow(trading);
	const plan = status?.plan;
	const next = status ? cycleTiming(status, now) : null;
	const settings = auto.settings;
	const busy = auto.pending !== null;

	return (
		<div className="flex flex-col gap-4 px-3 pt-4 pb-3">
			<div className="flex items-center justify-between gap-3">
				<span className="inline-flex items-center gap-2 text-sm font-medium">
					<AutoStatusDot tone={phaseTone(auto.phase)} />
					{PHASE_LABEL[auto.phase]}
				</span>
				{trading && next && <span className="text-xs text-fg-muted tabular-nums">Next cycle {next.label}</span>}
			</div>

			<InfoRowGroup>
				<InfoRow label="Equity" value={formatUSD(plan?.equity)} />
				<InfoRow
					label="Day PNL"
					value={formatUSD(plan?.dayPnl, { signDisplay: "exceptZero" })}
					valueClassName={plan?.dayPnl ? getValueColorClass(plan.dayPnl) : undefined}
				/>
				<InfoRow
					label="Markets"
					value={
						<a href={SETTINGS_URL} className="inline-flex items-center gap-1 transition-colors hover:text-brand">
							{auto.markets.length}
							<ArrowUpRightIcon className="size-3 text-fg-muted" />
						</a>
					}
				/>
			</InfoRowGroup>

			{settings && (
				<AutoSettingsForm
					key={JSON.stringify(settings)}
					saved={settings}
					saving={auto.pending === "settings"}
					disabled={busy || auto.phase === "closing"}
					onSave={auto.saveSettings}
				/>
			)}

			<div className="flex flex-col gap-2">
				{trading ? (
					<Button
						variant="secondary"
						intent="neutral"
						size="md"
						className="w-full"
						onClick={auto.pause}
						disabled={busy || auto.phase === "closing"}
						iconLeft={auto.pending === "pause" ? <SpinnerGapIcon className="size-4 animate-spin" /> : undefined}
					>
						Pause Auto Trader
					</Button>
				) : (
					<Button
						variant="filled"
						intent="brand"
						size="md"
						className="w-full"
						onClick={() => setConfirming(true)}
						disabled={busy}
						iconLeft={auto.pending === "start" ? <SpinnerGapIcon className="size-4 animate-spin" /> : undefined}
					>
						Start Auto Trader
					</Button>
				)}
				<p className="text-xs text-fg-muted">
					{trading ? "Pause keeps your open positions." : "Auto Trader is paused. Your positions stay open."}
				</p>
			</div>

			{settings && (
				<AutoStartModal
					open={confirming}
					settings={settings}
					marketCount={auto.markets.length}
					onCancel={() => setConfirming(false)}
					onConfirm={() => {
						setConfirming(false);
						void auto.start();
					}}
				/>
			)}
		</div>
	);
}
