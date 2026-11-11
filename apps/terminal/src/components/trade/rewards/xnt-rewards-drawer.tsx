import { Drawer, DrawerClose, DrawerContent } from "@hypeterminal/ui";
import { XIcon } from "@phosphor-icons/react";
import { DEFAULT_BUILDER_CONFIG } from "@/config/hyperliquid";
import { useXntRewards } from "@/hooks/use-xnt-rewards";
import { cn } from "@/lib/cn";
import { formatToken, formatUSD } from "@/lib/format";
import {
	barHeights,
	feeDecimals,
	feesToXnt,
	REWARD_DAYS,
	type RewardFill,
	type RewardSummary,
	XNT_PRICE_USD,
} from "@/lib/rewards/xnt-rewards";
import { XntMark } from "./xnt-mark";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const FEE_RATE = `${Number(DEFAULT_BUILDER_CONFIG?.f ?? 50) / 1000}%`;

export function XntRewardsDrawer({ open, onOpenChange }: Props) {
	const rewards = useXntRewards(open);
	return (
		<Drawer side="right" open={open} onOpenChange={onOpenChange}>
			<DrawerContent className="w-[420px] max-w-full">
				<div className="flex h-14 flex-none items-center gap-3 px-4">
					<div className="min-w-0 flex-1">
						<div className="text-sm font-medium">XNT rewards</div>
						<div className="text-2xs text-fg-muted">Your trading fees buy XNT for you</div>
					</div>
					<DrawerClose
						className="grid size-8 place-items-center rounded-8 text-fg-muted transition-colors hover:bg-fill-hover hover:text-fg"
						aria-label="Close"
					>
						<XIcon className="size-4" />
					</DrawerClose>
				</div>
				<div className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4">
					{rewards.data ? (
						<RewardsBody summary={rewards.data} limited={rewards.data.limited} />
					) : (
						<RewardsStatus error={rewards.isError} />
					)}
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function RewardsStatus({ error }: { error: boolean }) {
	return (
		<div className="mt-2 rounded-12 bg-surface p-5 text-center text-xs text-fg-muted">
			{error ? "Could not load your fee history. Try again soon." : "Loading your fee history…"}
		</div>
	);
}

function RewardsBody({ summary, limited }: { summary: RewardSummary; limited: boolean }) {
	const xnt = feesToXnt(summary.total);
	return (
		<div className="flex flex-col gap-2">
			<div className="rounded-12 bg-surface p-5">
				<div className="flex items-center gap-2 text-xs text-fg-muted">
					<XntMark size={20} />
					{xnt ? "XNT earned (estimate)" : "Fees sent to XNT"}
				</div>
				<div className="mt-3 text-[40px] leading-none font-semibold tabular-nums">
					{xnt ? formatToken(xnt, 2) : formatUSD(summary.total, feeDecimals(summary.total))}
					{xnt && <span className="ml-2 text-base font-medium text-fg-muted">XNT</span>}
				</div>
				<div className="mt-2 text-xs text-fg-muted tabular-nums">
					{xnt
						? `From ${formatUSD(summary.total, feeDecimals(summary.total))} in fees at ${formatUSD(XNT_PRICE_USD, 4)} per XNT`
						: "XNT amount shows here when payouts go live"}
				</div>
				<DailyBars daily={summary.daily} />
			</div>
			<div className="grid grid-cols-3 gap-2">
				<Stat label="Last 24h" value={formatUSD(summary.day, feeDecimals(summary.day))} />
				<Stat label="Last 7 days" value={formatUSD(summary.week, feeDecimals(summary.week))} />
				<Stat label="Trades" value={String(summary.trades)} />
			</div>
			<div className="rounded-12 bg-surface p-4">
				<div className="text-xs font-medium">How it works</div>
				<p className="mt-1 text-xs text-fg-muted">
					X1 takes a {FEE_RATE} builder fee on each trade. The fee buys XNT, and the XNT goes to your wallet.
				</p>
			</div>
			<div className="rounded-12 bg-surface p-4">
				<div className="text-xs font-medium">Payouts</div>
				<p className="mt-1 text-xs text-fg-muted">Each XNT payout shows here with a link to its transaction.</p>
			</div>
			<RecentFees fills={summary.recent} />
			{limited && (
				<p className="px-1 text-2xs text-fg-muted">
					Hyperliquid returns your latest 10,000 trades only. Older fees are not counted.
				</p>
			)}
		</div>
	);
}

function DailyBars({ daily }: { daily: readonly string[] }) {
	const heights = barHeights(daily);
	return (
		<div className="mt-5">
			<div className="flex h-12 items-end gap-1">
				{heights.map((h, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed day slots
						key={i}
						className={cn("flex-1 rounded-4", h > 0 ? "bg-brand" : "bg-control")}
						style={{ height: `${Math.max(h * 100, 6)}%` }}
					/>
				))}
			</div>
			<div className="mt-1.5 flex justify-between text-2xs text-fg-muted">
				<span>{REWARD_DAYS} days ago</span>
				<span>Today</span>
			</div>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-12 bg-surface p-3">
			<div className="text-2xs text-fg-muted">{label}</div>
			<div className="mt-1 text-sm font-medium tabular-nums">{value}</div>
		</div>
	);
}

function RecentFees({ fills }: { fills: readonly RewardFill[] }) {
	return (
		<div className="rounded-12 bg-surface p-4">
			<div className="text-xs font-medium">Recent fees</div>
			{fills.length === 0 ? (
				<p className="mt-1 text-xs text-fg-muted">Your first trade starts your XNT rewards.</p>
			) : (
				<ul className="mt-2 flex flex-col">
					{fills.map((fill) => (
						<li key={`${fill.coin}:${fill.tid}`} className="flex items-center justify-between gap-3 py-1.5 text-xs">
							<span className="min-w-0 truncate">
								<span className="font-medium">{fill.coin}</span>
								<span className="ml-1.5 text-fg-muted">{fill.dir}</span>
							</span>
							<span className="flex shrink-0 items-baseline gap-3 tabular-nums">
								<span className="text-fg-muted">
									{new Date(fill.time).toLocaleDateString([], { month: "short", day: "numeric" })}
								</span>
								<span className="w-16 text-right">{formatUSD(fill.fee, 3)}</span>
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
