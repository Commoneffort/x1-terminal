import { PauseIcon, PlayIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

interface Props {
	on: boolean;
	title: string;
	subtitle: string;
	equity: string;
	dayPnl: string;
	dayUp: boolean | null;
	markets: number;
	actionLabel: string;
	busy: boolean;
	disabled: boolean;
	onToggle: () => void;
	onMarkets: () => void;
}

export function AutoStatusCard({
	on,
	title,
	subtitle,
	equity,
	dayPnl,
	dayUp,
	markets,
	actionLabel,
	busy,
	disabled,
	onToggle,
	onMarkets,
}: Props) {
	return (
		<div className="flex flex-col gap-4 rounded-12 bg-control p-4">
			<div className="flex items-center gap-3">
				<span
					className={cn(
						"grid size-9 shrink-0 place-items-center rounded-full",
						on ? "bg-success-soft text-market-up" : "bg-control-hover text-fg-muted",
					)}
				>
					{on ? <PlayIcon weight="fill" className="size-4" /> : <PauseIcon weight="fill" className="size-4" />}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-medium">{title}</span>
					<span className="text-xs text-fg-muted tabular-nums">{subtitle}</span>
				</span>
				<button
					type="button"
					onClick={onToggle}
					disabled={disabled || busy}
					className={cn(
						"inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors disabled:opacity-50",
						on ? "bg-control-hover text-fg hover:bg-fill-hover" : "bg-fill text-fg-inverse hover:opacity-90",
					)}
				>
					{busy && <SpinnerGapIcon className="size-3.5 animate-spin" />}
					{actionLabel}
				</button>
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<Metric label="Equity" value={equity} />
				<Metric
					label="Day PNL"
					value={dayPnl}
					className={dayUp === null ? undefined : dayUp ? "text-market-up" : "text-market-down"}
				/>
				<button
					type="button"
					onClick={onMarkets}
					className="-m-1.5 flex flex-col gap-0.5 rounded-8 p-1.5 text-left transition-colors hover:bg-control-hover"
				>
					<span className="text-2xs text-fg-muted">Markets</span>
					<span className="tabular-nums underline decoration-fg-disabled decoration-dotted underline-offset-2">
						{markets} · Edit
					</span>
				</button>
			</div>
		</div>
	);
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-2xs text-fg-muted">{label}</span>
			<span className={cn("tabular-nums", className)}>{value}</span>
		</div>
	);
}
