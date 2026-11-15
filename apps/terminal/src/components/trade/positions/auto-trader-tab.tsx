import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hypeterminal/ui";
import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAutoTrader } from "@/hooks/use-auto-trader";
import { cycleTiming } from "@/lib/auto-trader/cycle-timing";
import { PHASE_LABEL, phaseTone } from "@/lib/auto-trader/phase";
import type { AutoTraderPlan, PlanRow } from "@/lib/auto-trader/types";
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
	accountTableShellClass,
	accountTabRootClass,
} from "./positions-panel-table-styles";

const HEADINGS = [
	{ label: "Market", numeric: false },
	{ label: "Signal", numeric: true },
	{ label: "Current", numeric: true },
	{ label: "Target", numeric: true },
	{ label: "Change", numeric: true },
	{ label: "Last action", numeric: false },
];

const num = cn(accountCellClass, accountNumCellClass);

function signedUsd(value: number) {
	return formatUSD(value, { signDisplay: "exceptZero", compact: false });
}

function actionText(row: PlanRow) {
	if (!row.acts.length) return "Hold";
	return row.acts.map((a) => a.charAt(0) + a.slice(1).toLowerCase()).join(" · ");
}

function lossStop(plan: AutoTraderPlan | null | undefined, killPct: number | undefined) {
	if (!plan?.dayStart || !killPct) return null;
	return { used: Math.max(0, -(plan.dayPnl ?? 0)), limit: plan.dayStart * killPct };
}

function useNow() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	return now;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-2xs tracking-micro text-fg-muted uppercase">{label}</span>
			<span className="text-xs tabular-nums">{children}</span>
		</div>
	);
}

export function AutoTraderTab() {
	const auto = useAutoTrader();
	const now = useNow();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const status = auto.status;
	const plan = status?.plan;
	const rows = (plan?.rows ?? []).filter((r) => r.curNtl !== 0 || r.tgtNtl !== 0);
	const next = status ? cycleTiming(status, now) : null;
	const stop = lossStop(plan, auto.settings?.killPct);
	const fills = plan?.fills ?? [];
	const failed = fills.filter((f) => f.error).length;

	if (!auto.available || auto.phase === "setup") return <Placeholder>Auto Trader is not set up.</Placeholder>;

	return (
		<div className={accountTabRootClass}>
			<AccountTableToolbar tab="auto-trader">{null}</AccountTableToolbar>
			<div className="flex shrink-0 flex-wrap gap-x-8 gap-y-2 px-3 py-2.5">
				<Stat label="Status">
					<span className="inline-flex items-center gap-1.5">
						<AutoStatusDot tone={phaseTone(auto.phase)} />
						{PHASE_LABEL[auto.phase]}
					</span>
				</Stat>
				<Stat label="Last cycle">{status?.lastCycle ? formatTime(status.lastCycle) : "—"}</Stat>
				<Stat label="Next cycle">{next?.label ?? "—"}</Stat>
				<Stat label="Equity">{formatUSD(plan?.equity)}</Stat>
				<Stat label="Day PNL">
					<span className={plan?.dayPnl ? getValueColorClass(plan.dayPnl) : undefined}>
						{plan?.dayPnl !== undefined ? signedUsd(plan.dayPnl) : "—"}
					</span>
				</Stat>
				<Stat label="Loss stop used">
					{stop ? (
						<span className="inline-flex items-center gap-2">
							<span className="relative h-1 w-16 overflow-hidden rounded-full bg-control">
								<span
									className={cn(
										"absolute inset-y-0 left-0 rounded-full",
										stop.used >= stop.limit ? "bg-warning" : "bg-fg-muted",
									)}
									style={{ width: `${Math.min(100, (stop.used / stop.limit) * 100)}%` }}
								/>
							</span>
							{formatUSD(stop.used)} of {formatUSD(stop.limit)}
						</span>
					) : (
						"—"
					)}
				</Stat>
				<Stat label="Last cycle orders">
					{fills.length - failed} filled{failed ? <span className="text-market-down"> · {failed} failed</span> : null}
				</Stat>
			</div>
			<div className={accountTableShellClass}>
				{rows.length === 0 ? (
					<Placeholder>No targets yet. The next cycle reports them here.</Placeholder>
				) : (
					<ScrollArea className="min-h-0 w-full flex-1">
						<Table className={accountTableClass}>
							<TableHeader>
								<TableRow>
									{HEADINGS.map((h) => (
										<TableHead
											key={h.label}
											scope="col"
											className={cn(accountHeadClass, h.numeric && accountNumHeadClass)}
										>
											{h.label}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((row) => {
									const change = row.tgtNtl - row.curNtl;
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
											<TableCell className={cn(num, row.weight ? getValueColorClass(row.weight) : "text-fg-muted")}>
												{row.weight === undefined ? "—" : `${row.weight > 0 ? "+" : ""}${Math.round(row.weight * 100)}`}
											</TableCell>
											<TableCell className={num}>{signedUsd(row.curNtl)}</TableCell>
											<TableCell className={num}>{signedUsd(row.tgtNtl)}</TableCell>
											<TableCell className={cn(num, Math.abs(change) < 1 && "text-fg-muted")}>
												{signedUsd(change)}
											</TableCell>
											<TableCell className={cn(accountCellClass, "text-fg-secondary")}>{actionText(row)}</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				)}
			</div>
		</div>
	);
}
