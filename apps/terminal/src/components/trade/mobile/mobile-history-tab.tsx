import { Button } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { Skeleton } from "boneyard-js/react";
import { useState } from "react";
import { FALLBACK_VALUE_PLACEHOLDER } from "@/config/app";
import { MAX_HISTORY_ROWS } from "@/config/trade";
import { useTradeHistory } from "@/hooks/use-trade-history";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { cn } from "@/lib/cn";
import { getHyperliquidTxUrl as getExplorerTxUrl } from "@/lib/explorer";
import { formatDateTimeShort, formatNumber, formatToken, formatUSD } from "@/lib/format";
import { useMarkets } from "@/lib/hyperliquid";
import { toNumber } from "@/lib/trade/numbers";
import { getValueColorClass } from "@/lib/ui/value-color";
import { useExchangeScope } from "@/providers/exchange-scope";
import { useMarketActions } from "@/stores/use-market-store";
import { AssetBadge } from "../components/asset-badge";
import { TradePnlShare } from "../positions/trade-pnl-share";
import { MetricCell } from "./metric-cell";

interface Props {
	className?: string;
}

export function MobileHistoryTab({ className }: Props) {
	const { isConnected } = useTradingAccount();
	const { scope } = useExchangeScope();
	const { setSelectedMarket } = useMarketActions();
	const markets = useMarkets();
	const { fills: allFills, status, warning, loading } = useTradeHistory();
	const [visible, setVisible] = useState(MAX_HISTORY_ROWS);
	const fills = allFills.slice(0, visible);

	const headerCount = isConnected ? `${fills.length}` : FALLBACK_VALUE_PLACEHOLDER;

	if (!isConnected) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">
				{t`Connect your wallet to view trade history.`}
			</div>
		);
	}

	if (status === "active" && fills.length === 0 && !warning) {
		return (
			<div className="flex-1 flex items-center justify-center px-3 py-6 text-center text-xs text-fg-muted">{t`No fills found.`}</div>
		);
	}

	return (
		<Skeleton name="history-tab" loading={status === "subscribing"}>
			<div className={cn("flex-1 min-h-0 flex flex-col", className)}>
				<div className="shrink-0 h-10 px-3 flex items-center justify-between gap-2">
					<span className="text-2xs uppercase tracking-micro text-fg-muted">{t`Trade History`}</span>
					<span className="text-xs tabular-nums text-fg">{headerCount}</span>
				</div>
				<output className="block shrink-0 px-3 pb-2 text-2xs text-fg-muted">
					{t`Last 24 hours`}
					{loading ? <span className="ml-2">{t`Updating…`}</span> : null}
					{warning && <span className="ml-2 text-error">{warning}</span>}
				</output>
				<div className="flex-1 min-h-0 overflow-y-auto divide-y divide-stroke-faint border-t border-stroke-faint">
					{fills.map((fill) => {
						const market = markets.getMarket(fill.coin);
						const quote = getQuoteSymbol(market);
						const symbol =
							market?.kind === "spot"
								? (market.tokensInfo[0]?.displayName ?? market.shortName)
								: (market?.shortName ?? fill.coin);
						const fee = toNumber(fill.fee);
						const closedPnl = toNumber(fill.closedPnl);
						const showPnl = closedPnl !== null && closedPnl !== 0;
						const isLiquidation = !!fill.liquidation;
						const isBuy = fill.dir.startsWith("Open Long") || fill.dir.startsWith("Close Short");
						const explorerUrl = getExplorerTxUrl(fill.hash);

						return (
							<div key={`${fill.hash}-${fill.tid}`} className="flex flex-col gap-3 px-3 py-3">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<AssetBadge
											coin={fill.coin}
											side={isBuy ? "buy" : "sell"}
											onClick={() => setSelectedMarket(scope, fill.coin)}
											appearance="plain"
											className="min-h-8"
											nameClassName="text-base font-medium text-fg"
										/>
										<span className={cn("text-xs font-medium", getFillDirectionClass(isLiquidation, isBuy))}>
											{isLiquidation ? t`Liquidated` : fill.dir}
										</span>
									</div>
									{showPnl && (
										<div className="flex items-center gap-1">
											<span className={cn("text-xs font-medium tabular-nums", getValueColorClass(closedPnl))}>
												{formatUSD(closedPnl, { signDisplay: "exceptZero" })}
											</span>
											<TradePnlShare
												fill={fill}
												symbol={symbol}
												quote={quote}
												szDecimals={markets.getSzDecimals(fill.coin)}
											/>
										</div>
									)}
								</div>

								<div className="grid grid-cols-3 gap-3">
									<MetricCell label={t`Price`} value={formatUSD(fill.px)} />
									<MetricCell label={t`Size`} value={formatNumber(fill.sz, markets.getSzDecimals(fill.coin))} />
									<MetricCell
										label={t`Fee`}
										align="end"
										value={formatToken(fill.fee, { symbol: fill.feeToken })}
										valueClass={fee !== null ? getValueColorClass(fee) : undefined}
									/>
								</div>

								<div className="flex items-center justify-between gap-2">
									<span className="text-xs text-fg-muted tabular-nums">{formatDateTimeShort(fill.time)}</span>
									{explorerUrl && (
										<a
											href={explorerUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="-mr-1 inline-flex min-h-8 items-center gap-1 rounded-8 px-1 text-xs text-fg-muted transition-colors duration-150 hover:text-fg active:text-fg touch-manipulation motion-reduce:transition-none"
										>
											{t`Explorer`}
											<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
										</a>
									)}
								</div>
							</div>
						);
					})}
					{allFills.length > visible && (
						<div className="px-3 py-3">
							<Button
								variant="secondary"
								intent="neutral"
								size="sm"
								className="w-full"
								onClick={() => setVisible((value) => value + MAX_HISTORY_ROWS)}
							>
								{t`Show more trades`}
							</Button>
						</div>
					)}
				</div>
			</div>
		</Skeleton>
	);
}

function getFillDirectionClass(isLiquidation: boolean, isBuy: boolean): string {
	if (isLiquidation || !isBuy) return "text-market-down";
	return "text-market-up";
}

function getQuoteSymbol(market: ReturnType<ReturnType<typeof useMarkets>["getMarket"]>): string {
	if (market?.kind === "spot") return market.tokensInfo[1]?.displayName ?? "USDC";
	if (market?.kind === "builderPerp") return market.quoteToken?.displayName ?? "USDC";
	return "USDC";
}
