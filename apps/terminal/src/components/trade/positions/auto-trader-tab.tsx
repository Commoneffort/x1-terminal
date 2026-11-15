import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { CheckIcon, QuestionIcon, XIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AUTO_TRADER_MIN_EQUITY } from "@/config/auto-trader";
import { useAutoForecast } from "@/hooks/use-auto-forecast";
import { useAutoTrader } from "@/hooks/use-auto-trader";
import { executorActionLabel } from "@/lib/auto-trader/action-label";
import { cycleTiming } from "@/lib/auto-trader/cycle-timing";
import { phaseTone } from "@/lib/auto-trader/phase";
import { autoStatusText } from "@/lib/auto-trader/status-text";
import type { AutoTraderPlan } from "@/lib/auto-trader/types";
import { cn } from "@/lib/cn";
import { formatTime, formatUSD } from "@/lib/format";
import { getValueColorClass } from "@/lib/ui/value-color";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AutoStatusDot } from "../auto/auto-status-dot";
import { AssetDisplay } from "../components/asset-display";
import { AccountTableToolbar } from "./account-table-toolbar";
import { Placeholder } from "./placeholder";
import {
	accountCellClass,
	accountHeadClass,
	accountNumCellClass,
	accountNumHeadClass,
	accountRowClass,
	accountTableClass,
	accountTabRootClass,
} from "./positions-panel-table-styles";

const num = cn(accountCellClass, accountNumCellClass);
const SIGNAL_FRESH_MS = 10 * 60_000;

interface TargetRow {
	coin: string;
	score: number | null;
	current: number | null;
	target: number | null;
	action: string;
}

function signedUsd(value: number | null) {
	if (value === null) return "-";
	return formatUSD(value, { signDisplay: "exceptZero", compact: false });
}

function useNow() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	return now;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			<span className="text-xs tabular-nums">{children}</span>
		</div>
	);
}

function Guard({ label, value }: { label: string; value: boolean | undefined }) {
	const Icon = value === undefined ? QuestionIcon : value ? CheckIcon : XIcon;
	return (
		<span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-control px-2.5 text-xs">
			<Icon
				weight="bold"
				className={cn(
					"size-3",
					value === undefined && "text-fg-muted",
					value === true && "text-market-up",
					value === false && "text-market-down",
				)}
			/>
			{label}
		</span>
	);
}

function guards(plan: AutoTraderPlan | null | undefined, now: number) {
	return [
		{ label: "Agent approval", value: plan?.agentApproved },
		{ label: "Builder fee", value: plan?.builderFeeOk },
		{ label: "Daily loss stop", value: plan?.killed === undefined ? undefined : !plan.killed },
		{ label: "Fresh signal", value: plan?.signalTs ? now - plan.signalTs <= SIGNAL_FRESH_MS : undefined },
		{
			label: "Minimum equity",
			value: typeof plan?.equity === "number" ? plan.equity >= AUTO_TRADER_MIN_EQUITY : undefined,
		},
	];
}

export function AutoTraderTab() {
	const auto = useAutoTrader();
	const now = useNow();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const status = auto.status;
	const plan = status?.plan;
	const planRows = (plan?.rows ?? []).filter((r) => r.curNtl !== 0 || r.tgtNtl !== 0);
	const useForecast = planRows.length === 0 || auto.phase === "paused";
	const { forecast, reason } = useAutoForecast({
		settings: auto.settings,
		status,
		signal: auto.signal,
		universe: auto.universe,
		enabled: useForecast && auto.available && auto.phase !== "setup",
	});
	const timing = status ? cycleTiming(status, now) : null;
	const { title } = autoStatusText(auto.phase, status, timing?.at ? timing.label : null, now);
	const stopLimit = plan?.dayStart && auto.settings ? plan.dayStart * auto.settings.killPct : null;
	const stopUsed = Math.max(0, -(plan?.dayPnl ?? 0));
	const orders = plan?.orders ?? [];
	const fills = plan?.fills ?? [];
	const note = plan?.skip ?? plan?.sendNote;

	if (!auto.available || auto.phase === "setup") return <Placeholder>Auto Trader is not set up.</Placeholder>;

	const rows: TargetRow[] = useForecast
		? (forecast?.rows ?? []).map((r) => ({
				coin: r.market,
				score: r.score,
				current: r.currentUsd,
				target: r.targetUsd,
				action:
					r.targetUsd === null || r.currentUsd === null
						? r.action
						: executorActionLabel({ ...r, targetUsd: r.targetUsd, currentUsd: r.currentUsd }),
			}))
		: planRows.map((r) => ({
				coin: r.coin,
				score: r.weight === undefined ? null : Math.round(r.weight * 100),
				current: r.curNtl,
				target: r.tgtNtl,
				action: r.acts.length ? r.acts.map((a) => a.charAt(0) + a.slice(1).toLowerCase()).join(" · ") : "Hold",
			}));

	return (
		<div className={accountTabRootClass}>
			<AccountTableToolbar tab="auto-trader">{null}</AccountTableToolbar>
			<ScrollArea className="min-h-0 w-full flex-1">
				<div className="flex flex-col gap-4 px-3 py-3">
					<div className="flex flex-wrap gap-x-8 gap-y-3">
						<Stat label="Status">
							<span className="inline-flex items-center gap-1.5">
								<AutoStatusDot tone={phaseTone(auto.phase)} />
								{title}
							</span>
						</Stat>
						<Stat label="Last cycle">{status?.lastCycle ? formatTime(status.lastCycle) : "-"}</Stat>
						<Stat label="Next cycle">{timing?.label ?? "-"}</Stat>
						<Stat label="Equity">{formatUSD(plan?.equity)}</Stat>
						<Stat label="Day PNL">
							<span className={plan?.dayPnl ? getValueColorClass(plan.dayPnl) : undefined}>
								{plan?.dayPnl === undefined ? "-" : signedUsd(plan.dayPnl)}
							</span>
						</Stat>
						<Stat label="Loss stop used">
							{stopLimit ? (
								<span className="inline-flex items-center gap-2">
									<span className="relative h-1 w-16 overflow-hidden rounded-full bg-control">
										<span
											className={cn(
												"absolute inset-y-0 left-0 rounded-full",
												stopUsed >= stopLimit ? "bg-warning" : "bg-fg-muted",
											)}
											style={{ width: `${Math.min(100, (stopUsed / stopLimit) * 100)}%` }}
										/>
									</span>
									{formatUSD(stopUsed)} of {formatUSD(stopLimit)}
								</span>
							) : (
								"-"
							)}
						</Stat>
						<Stat label="Trading key">
							{status?.agent ? `${status.agent.slice(0, 6)}…${status.agent.slice(-4)}` : "-"}
							{status?.validUntil && (
								<span className="text-fg-muted">
									{" "}
									· expires {new Date(status.validUntil).toLocaleDateString([], { month: "short", day: "numeric" })}
								</span>
							)}
						</Stat>
					</div>

					<div className="flex flex-wrap gap-2">
						{guards(plan, now).map((g) => (
							<Guard key={g.label} label={g.label} value={g.value} />
						))}
					</div>

					{note && <p className="text-xs text-fg-secondary">{note}</p>}
					{plan?.killed && (
						<p className="text-xs text-fg-secondary">
							The daily loss stop is reached. Auto Trader only reduces exposure until the UTC daily reset.
						</p>
					)}

					<Section
						title={useForecast ? "Forecast" : "Targets from the last cycle"}
						hint={
							useForecast
								? (reason ?? "From current scores and positions. No trades run while Auto Trader is paused.")
								: undefined
						}
					>
						{rows.length === 0 ? (
							<p className="py-4 text-center text-xs text-fg-muted">No targets yet.</p>
						) : (
							<Table className={accountTableClass}>
								<TableHeader>
									<TableRow>
										{["Market", "Signal", "Current", "Target", "Change", "Action"].map((h, i) => (
											<TableHead
												key={h}
												scope="col"
												className={cn(accountHeadClass, i > 0 && i < 5 && accountNumHeadClass)}
											>
												{h}
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((row) => {
										const change = row.target !== null && row.current !== null ? row.target - row.current : null;
										return (
											<TableRow key={row.coin} className={accountRowClass}>
												<TableCell className={accountCellClass}>
													<button
														type="button"
														onClick={() => setSelectedMarket(scope, row.coin)}
														className="flex items-center gap-2 rounded-4 focus-visible:outline-2 focus-visible:outline-stroke-focus"
													>
														<AssetDisplay coin={row.coin} iconClassName="size-5" />
													</button>
												</TableCell>
												<TableCell className={cn(num, row.score ? getValueColorClass(row.score) : "text-fg-muted")}>
													{row.score === null ? "-" : `${row.score > 0 ? "+" : ""}${Math.round(row.score)}`}
												</TableCell>
												<TableCell className={num}>{signedUsd(row.current)}</TableCell>
												<TableCell className={num}>{signedUsd(row.target)}</TableCell>
												<TableCell className={cn(num, change !== null && Math.abs(change) < 1 && "text-fg-muted")}>
													{signedUsd(change)}
												</TableCell>
												<TableCell className={cn(accountCellClass, "text-fg-secondary")}>{row.action}</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						)}
					</Section>

					<Section title="Last cycle orders">
						{orders.length === 0 && fills.length === 0 ? (
							<p className="py-4 text-center text-xs text-fg-muted">No orders in the last cycle.</p>
						) : (
							<Table className={accountTableClass}>
								<TableHeader>
									<TableRow>
										{["Type", "Market", "Action", "Side", "Size", "Price", "Result"].map((h, i) => (
											<TableHead
												key={h}
												scope="col"
												className={cn(accountHeadClass, (i === 4 || i === 5) && accountNumHeadClass)}
											>
												{h}
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{orders.map((o, i) => (
										<TableRow key={`o${o.coin}${i}`} className={accountRowClass}>
											<TableCell className={cn(accountCellClass, "text-fg-muted")}>Planned</TableCell>
											<TableCell className={accountCellClass}>{o.coin}</TableCell>
											<TableCell className={accountCellClass}>
												{o.tag}
												{o.reduceOnly ? " · reduce only" : ""}
											</TableCell>
											<TableCell className={cn(accountCellClass, o.isBuy ? "text-market-up" : "text-market-down")}>
												{o.isBuy ? "Buy" : "Sell"}
											</TableCell>
											<TableCell className={num}>{o.sz}</TableCell>
											<TableCell className={num}>{formatUSD(o.px)}</TableCell>
											<TableCell className={accountCellClass}>{formatUSD(o.ntl)}</TableCell>
										</TableRow>
									))}
									{fills.map((f, i) => (
										<TableRow key={`f${f.coin}${i}`} className={accountRowClass}>
											<TableCell className={cn(accountCellClass, "text-fg-muted")}>Result</TableCell>
											<TableCell className={accountCellClass}>{f.coin}</TableCell>
											<TableCell className={accountCellClass}>{f.tag}</TableCell>
											<TableCell
												className={cn(accountCellClass, f.side === "B" ? "text-market-up" : "text-market-down")}
											>
												{f.side === "B" ? "Buy" : "Sell"}
											</TableCell>
											<TableCell className={num}>
												{f.filled ?? "-"} / {f.sz}
											</TableCell>
											<TableCell className={num}>{formatUSD(f.avgPx)}</TableCell>
											<TableCell className={cn(accountCellClass, f.error && "text-market-down")}>
												{f.error ?? "Filled"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</Section>
				</div>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</div>
	);
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-baseline gap-3">
				<span className="text-xs font-medium">{title}</span>
				{hint && <span className="text-xs text-fg-muted">{hint}</span>}
			</div>
			{children}
		</div>
	);
}
