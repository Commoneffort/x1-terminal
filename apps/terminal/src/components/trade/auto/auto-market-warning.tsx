import { RobotIcon } from "@phosphor-icons/react";
import { useAutoTrader } from "@/hooks/use-auto-trader";
import { isTrading, managesMarket, withoutMarket } from "@/lib/auto-trader/phase";

interface Props {
	coin: string | undefined;
	label: string;
	isPerp: boolean;
}

export function AutoMarketWarning({ coin, label, isPerp }: Props) {
	const auto = useAutoTrader();
	if (!coin || !isPerp || !auto.settings || !isTrading(auto.phase)) return null;
	if (!managesMarket(auto.settings, auto.universe, coin)) return null;
	const settings = auto.settings;
	const busy = auto.pending === "settings";
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between gap-3 text-xs">
				<span
					className="inline-flex min-w-0 items-center gap-1.5 text-fg-muted"
					title={`Auto Trader resizes ${label} positions every cycle, including positions you open here.`}
				>
					<RobotIcon className="size-3.5 shrink-0" />
					<span className="truncate">Auto Trader also trades {label}</span>
				</span>
				<button
					type="button"
					disabled={busy}
					onClick={() => void auto.saveSettings(withoutMarket(settings, auto.universe, coin))}
					className="shrink-0 text-fg-secondary transition-colors hover:text-fg disabled:opacity-50"
				>
					{busy ? "Confirm in wallet…" : "Exclude"}
				</button>
			</div>
			{auto.error && <p className="text-xs text-market-down">{auto.error}</p>}
		</div>
	);
}
