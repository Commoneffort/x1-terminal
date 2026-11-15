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
		<div className="flex gap-2.5 rounded-8 bg-warning-soft p-2.5 text-xs">
			<RobotIcon className="mt-0.5 size-4 shrink-0 text-warning" />
			<div className="flex min-w-0 flex-col gap-1.5">
				<p className="text-fg-secondary">
					Auto Trader manages {label}. Its next cycle resizes any {label} position you open here.
				</p>
				<button
					type="button"
					disabled={busy}
					onClick={() => void auto.saveSettings(withoutMarket(settings, auto.universe, coin))}
					className="self-start font-medium text-warning transition-opacity hover:opacity-80 disabled:opacity-50"
				>
					{busy ? "Confirm in wallet…" : `Remove ${label} from Auto`}
				</button>
				{auto.error && <p className="text-market-down">{auto.error}</p>}
			</div>
		</div>
	);
}
