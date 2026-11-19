import { Button, ButtonIcon, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowsDownUpIcon, CaretDownIcon, CaretLeftIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InfoRow, InfoRowGroup } from "@/components/ui/info-row";
import { NumberInput } from "@/components/ui/number-input";
import { DEFAULT_QUOTE_TOKEN } from "@/config/app";
import { SWAP_SUCCESS_DURATION_MS } from "@/config/time";
import { getSpotAvailable, getSpotBalance } from "@/domain/trade/balances";
import { buildOrderPlan } from "@/domain/trade/order-intent";
import { findSpotPair, getAvailablePairTokens, getSwapSide } from "@/domain/trade/swap";
import { useDefaultDexBalances } from "@/hooks/trade/use-account-balances";
import { useSubmitPlan } from "@/hooks/trade/use-submit-plan";
import { useAutoCloseSuccess } from "@/hooks/ui/use-auto-close-success";
import { cn } from "@/lib/cn";
import { formatToken } from "@/lib/format";
import { useMarketsInfo } from "@/lib/hyperliquid/hooks/useMarketsInfo";
import { toNumber, toNumberOrZero } from "@/lib/trade/numbers";
import {
	useSwapModalActions,
	useSwapModalFromToken,
	useSwapModalOpen,
	useSwapModalToToken,
} from "@/stores/use-global-modal-store";
import { AssetDisplay } from "./asset-display";
import { SwapTokenPicker } from "./swap-token-picker";
import { TradingActionButton } from "./trading-action-button";

const DEFAULT_SLIPPAGE_BPS = 100;

export function SpotSwapModal() {
	const isOpen = useSwapModalOpen();
	const initialFromToken = useSwapModalFromToken() ?? DEFAULT_QUOTE_TOKEN;
	const initialToToken = useSwapModalToToken();
	const { close } = useSwapModalActions();

	if (!isOpen) return null;

	return <SpotSwapModalContent initialFromToken={initialFromToken} initialToToken={initialToToken} onClose={close} />;
}

interface Props {
	embedded?: boolean;
	fixedPair?: boolean;
	reserveFromBalance?: number;
	onSubmitted?: () => void;
	onBusyChange?: (busy: boolean) => void;
	contextNote?: string;
	initialFromToken: string;
	initialToToken?: string;
	onClose: () => void;
}

export function SpotSwapModalContent({
	initialFromToken,
	initialToToken,
	onClose,
	fixedPair = false,
	reserveFromBalance = 0,
	onSubmitted,
	onBusyChange,
	contextNote,
	embedded = false,
}: Props) {
	const { spotMarkets } = useMarketsInfo();
	const { spotBalances, spotAvailableAfterMaintenance } = useDefaultDexBalances();
	const { submitPlan, isSubmitting } = useSubmitPlan();

	const defaultToToken = useMemo(() => {
		if (initialToToken) return initialToToken;
		const pairs = getAvailablePairTokens(initialFromToken, spotMarkets);
		return pairs[0]?.name ?? "";
	}, [initialFromToken, initialToToken, spotMarkets]);

	const [fromToken, setFromToken] = useState(initialFromToken);
	const [toToken, setToToken] = useState(defaultToToken);
	const [amount, setAmount] = useState("");
	const [picking, setPicking] = useState<"from" | "to" | null>(null);
	const { showSuccess, trigger: triggerAutoClose } = useAutoCloseSuccess(onClose, SWAP_SUCCESS_DURATION_MS);

	const getTokenBalance = useCallback(
		(token: string) => {
			const balance = getSpotBalance(spotBalances, token);
			return getSpotAvailable(balance, spotAvailableAfterMaintenance);
		},
		[spotBalances, spotAvailableAfterMaintenance],
	);

	const fromBalance = getTokenBalance(fromToken);
	const maxSpend =
		reserveFromBalance > 0
			? Math.max(0, fromBalance - reserveFromBalance) / (1 + DEFAULT_SLIPPAGE_BPS / 10_000)
			: fromBalance;
	useEffect(() => {
		onBusyChange?.(isSubmitting);
		return () => onBusyChange?.(false);
	}, [isSubmitting, onBusyChange]);
	const toBalance = getTokenBalance(toToken);

	const availableFromTokens = useMemo(() => {
		if (!toToken) return [];
		return getAvailablePairTokens(toToken, spotMarkets);
	}, [toToken, spotMarkets]);

	const availableToTokens = useMemo(() => {
		if (!fromToken) return [];
		return getAvailablePairTokens(fromToken, spotMarkets);
	}, [fromToken, spotMarkets]);

	const spotMarket = useMemo(() => {
		if (!fromToken || !toToken) return null;
		return findSpotPair(fromToken, toToken, spotMarkets);
	}, [fromToken, toToken, spotMarkets]);

	const markPx = toNumberOrZero(spotMarket?.markPx);
	const szDecimals = spotMarket?.szDecimals ?? 2;
	const baseToken = spotMarket?.tokensInfo[0]?.name ?? "";
	const isBuying = spotMarket ? getSwapSide(fromToken, spotMarket) : false;

	const amountValue = toNumber(amount) ?? 0;

	const { estimatedReceive, orderSize } = useMemo(() => {
		if (amountValue <= 0 || markPx <= 0) {
			return { estimatedReceive: 0, orderSize: 0 };
		}

		if (isBuying) {
			const size = amountValue / markPx;
			return { estimatedReceive: size, orderSize: size };
		}
		const receive = amountValue * markPx;
		return { estimatedReceive: receive, orderSize: amountValue };
	}, [amountValue, markPx, isBuying]);

	const rate = useMemo(() => {
		if (markPx <= 0) return 0;
		if (fromToken === baseToken) {
			return markPx;
		}
		return 1 / markPx;
	}, [markPx, fromToken, baseToken]);

	function handleFlip() {
		const newFrom = toToken;
		const newTo = fromToken;
		setFromToken(newFrom);
		setToToken(newTo);
		setAmount("");
	}

	function handleFromTokenChange(token: string) {
		setFromToken(token);
		setAmount("");

		const pairs = getAvailablePairTokens(token, spotMarkets);
		if (!pairs.some((p) => p.name === toToken)) {
			setToToken(pairs[0]?.name ?? "");
		}
	}

	function handleToTokenChange(token: string) {
		setToToken(token);

		const pairs = getAvailablePairTokens(token, spotMarkets);
		if (!pairs.some((p) => p.name === fromToken)) {
			setFromToken(pairs[0]?.name ?? "");
			setAmount("");
		}
	}

	function handleMaxClick() {
		setAmount(String(maxSpend));
	}

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open && !isSubmitting) onClose();
		},
		[onClose, isSubmitting],
	);

	const handleSubmit = useCallback(async () => {
		if (!spotMarket || orderSize <= 0 || amountValue <= 0 || amountValue > maxSpend || isSubmitting) return;

		const plan = buildOrderPlan({
			kind: "swap",
			assetId: spotMarket.assetId,
			isBuy: isBuying,
			sizeValue: orderSize,
			szDecimals,
			markPx,
			slippageBps: DEFAULT_SLIPPAGE_BPS,
		});

		if (
			reserveFromBalance > 0 &&
			isBuying &&
			plan.orders.some((order) => Number(order.p) * Number(order.s) > fromBalance - reserveFromBalance)
		) {
			toast.error("Reduce the swap amount slightly to leave the withdrawal activation reserve.");
			return;
		}
		const result = await submitPlan(plan);
		if (result.ok) {
			onSubmitted?.();
			triggerAutoClose();
		} else {
			toast.error(result.error || t`Swap failed`);
		}
	}, [
		spotMarket,
		orderSize,
		isSubmitting,
		isBuying,
		markPx,
		szDecimals,
		submitPlan,
		triggerAutoClose,
		onSubmitted,
		amountValue,
		maxSpend,
		reserveFromBalance,
		fromBalance,
	]);

	const insufficientBalance = amountValue > maxSpend;
	const noPairAvailable = fromToken && toToken && !spotMarket;
	const canSubmit = amountValue > 0 && !insufficientBalance && orderSize > 0 && !showSuccess && spotMarket;
	const isDisabled = isSubmitting || showSuccess;

	const fromName = spotMarket?.tokensInfo.find((token) => token.name === fromToken)?.displayName ?? fromToken;
	const toName = spotMarket?.tokensInfo.find((token) => token.name === toToken)?.displayName ?? toToken;

	if (embedded) {
		return (
			<>
				<ModalHeader className="sr-only">
					<ModalTitle>
						Swap {fromName} to {toName}
					</ModalTitle>
				</ModalHeader>
				<ModalContent className="space-y-3">
					<div className="flex min-h-6 items-center justify-between text-xs">
						<span className="font-medium text-fg">
							Swap {fromName} → {toName}
						</span>
						<span className="text-fg-muted tabular-nums">
							{formatToken(fromBalance, { decimals: 2, symbol: fromName })}
						</span>
					</div>
					<NumberInput
						aria-label="Swap amount"
						inlineLabel={`Amount (${fromName})`}
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						disabled={isDisabled}
						placeholder="0.00"
						maxLabel="Max"
						onMaxClick={handleMaxClick}
						invalid={insufficientBalance}
					/>
					<InfoRowGroup>
						<InfoRow label="Estimated receive" value={formatToken(estimatedReceive, { decimals: 6, symbol: toName })} />
						<InfoRow label="Slippage" value={`${DEFAULT_SLIPPAGE_BPS / 100}%`} />
						{reserveFromBalance > 0 && (
							<InfoRow label="USDC kept for activation" value={`${reserveFromBalance} USDC`} />
						)}
					</InfoRowGroup>
					{noPairAvailable && (
						<p role="alert" className="text-xs text-market-down">
							This swap pair is unavailable.
						</p>
					)}
					{insufficientBalance && (
						<p role="alert" className="text-xs text-market-down">
							Amount exceeds the balance available to swap.
						</p>
					)}
					{showSuccess && <output className="block text-xs text-market-up">Swap submitted.</output>}
					<TradingActionButton
						size="md"
						onClick={handleSubmit}
						disabled={!canSubmit || isSubmitting}
						className="w-full"
					>
						{isSubmitting ? "Swapping…" : "Confirm swap"}
					</TradingActionButton>
					<Button
						variant="ghost"
						intent="neutral"
						size="xs"
						disabled={isSubmitting}
						onClick={onClose}
						className="w-full text-fg-muted hover:text-fg"
					>
						Back to withdrawal
					</Button>
				</ModalContent>
			</>
		);
	}

	const actionLabel = getActionLabel({
		showSuccess,
		insufficientBalance,
		noPairAvailable: !!noPairAvailable,
		hasAmount: amountValue > 0,
		fromName,
	});

	function pick(token: string) {
		if (picking === "from") handleFromTokenChange(token);
		if (picking === "to") handleToTokenChange(token);
		setPicking(null);
	}

	function setPartial(fraction: number) {
		setAmount(String(maxSpend * fraction));
	}

	return (
		<Modal open onOpenChange={handleOpenChange}>
			<ModalPopup size="sm" showClose={!isSubmitting}>
				<ModalHeader>
					<ModalTitle className="flex items-center gap-2">
						{picking && (
							<button
								type="button"
								onClick={() => setPicking(null)}
								aria-label="Back to swap"
								className="-ml-1 grid size-7 place-items-center rounded-8 text-fg-muted transition-colors hover:bg-control hover:text-fg"
							>
								<CaretLeftIcon weight="bold" className="size-4" />
							</button>
						)}
						{picking ? "Select a token" : <Trans>Swap</Trans>}
					</ModalTitle>
				</ModalHeader>
				<ModalContent className="flex flex-col gap-3">
					{picking ? (
						<SwapTokenPicker
							tokens={picking === "from" ? availableFromTokens : availableToTokens}
							selected={picking === "from" ? fromToken : toToken}
							getBalance={getTokenBalance}
							onSelect={pick}
						/>
					) : (
						<>
							{contextNote && <p className="text-xs text-fg-muted">{contextNote}</p>}
							<div className="relative flex flex-col gap-1">
								<SwapSide
									label="You pay"
									balance={formatToken(fromBalance, { decimals: 4, symbol: fromName })}
									actions={
										<>
											<QuickFill disabled={isDisabled || fromBalance <= 0} onClick={() => setPartial(0.5)}>
												Half
											</QuickFill>
											<QuickFill disabled={isDisabled || fromBalance <= 0} onClick={handleMaxClick}>
												Max
											</QuickFill>
										</>
									}
									token={
										<TokenPill
											token={fromToken}
											label={fromName}
											disabled={isDisabled || fixedPair}
											onClick={() => setPicking("from")}
										/>
									}
								>
									<input
										aria-label="Swap amount"
										inputMode="decimal"
										placeholder="0"
										value={amount}
										disabled={isDisabled}
										onChange={(e) => {
											if (!/^\d*\.?\d*$/.test(e.target.value)) return;
											setAmount(e.target.value);
										}}
										className={cn(
											"w-full min-w-0 bg-transparent text-2xl font-medium tabular-nums outline-none placeholder:text-fg-disabled",
											insufficientBalance ? "text-market-down" : "text-fg",
										)}
									/>
								</SwapSide>
								<div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-overlay p-1">
									<ButtonIcon
										variant="secondary"
										intent="neutral"
										size="sm"
										onClick={handleFlip}
										disabled={isDisabled || fixedPair}
										aria-label={t`Swap direction`}
										className="rounded-full bg-control-hover"
									>
										<ArrowsDownUpIcon className="size-4" />
									</ButtonIcon>
								</div>
								<SwapSide
									label="You receive"
									balance={formatToken(toBalance, { decimals: 4, symbol: toName })}
									token={
										<TokenPill
											token={toToken}
											label={toName}
											disabled={isDisabled || fixedPair}
											onClick={() => setPicking("to")}
										/>
									}
								>
									<output
										aria-label="Estimated receive"
										aria-live="polite"
										className={cn(
											"block truncate text-2xl font-medium tabular-nums",
											estimatedReceive > 0 ? "text-fg" : "text-fg-disabled",
										)}
									>
										{estimatedReceive > 0 ? formatToken(estimatedReceive, 6) : "0"}
									</output>
								</SwapSide>
							</div>
							<InfoRowGroup className="px-1">
								<InfoRow
									label="Rate"
									value={rate > 0 ? `1 ${fromName} ≈ ${formatToken(rate, 6)} ${toName}` : "Unavailable"}
								/>
								<InfoRow label="Max slippage" value={`${DEFAULT_SLIPPAGE_BPS / 100}%`} />
								{reserveFromBalance > 0 && (
									<InfoRow
										label="Kept for activation"
										value={formatToken(reserveFromBalance, { decimals: 2, symbol: fromName })}
									/>
								)}
							</InfoRowGroup>
							<TradingActionButton
								size="md"
								onClick={handleSubmit}
								disabled={!canSubmit || isSubmitting}
								className="w-full"
							>
								{isSubmitting ? (
									<>
										<SpinnerGapIcon className="size-4 animate-spin" />
										Swapping…
									</>
								) : (
									actionLabel
								)}
							</TradingActionButton>
						</>
					)}
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}

interface ActionLabelInput {
	showSuccess: boolean;
	insufficientBalance: boolean;
	noPairAvailable: boolean;
	hasAmount: boolean;
	fromName: string;
}

function getActionLabel({ showSuccess, insufficientBalance, noPairAvailable, hasAmount, fromName }: ActionLabelInput) {
	if (showSuccess) return "Swap submitted";
	if (insufficientBalance) return `Insufficient ${fromName}`;
	if (noPairAvailable) return "Pair unavailable";
	if (!hasAmount) return "Enter an amount";
	return "Swap";
}

interface SwapSideProps {
	label: string;
	balance: string;
	actions?: React.ReactNode;
	token: React.ReactNode;
	children: React.ReactNode;
}

function SwapSide({ label, balance, actions, token, children }: SwapSideProps) {
	return (
		<div className="flex flex-col gap-3 rounded-12 bg-control p-4">
			<div className="flex min-h-5 items-center justify-between gap-2 text-xs text-fg-muted">
				<span>{label}</span>
				<span className="flex min-w-0 items-center gap-2">
					<span className="truncate tabular-nums">{balance}</span>
					{actions}
				</span>
			</div>
			<div className="flex items-center gap-3">
				<div className="min-w-0 flex-1">{children}</div>
				{token}
			</div>
		</div>
	);
}

function QuickFill({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: string }) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="font-medium text-fg-secondary transition-colors hover:text-fg disabled:text-fg-disabled"
		>
			{children}
		</button>
	);
}

interface TokenPillProps {
	token: string;
	label: string;
	disabled: boolean;
	onClick: () => void;
}

function TokenPill({ token, label, disabled, onClick }: TokenPillProps) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			aria-label={`Select token: ${label}`}
			className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-control-hover pr-3 pl-1.5 text-sm font-medium transition-colors hover:bg-fill-hover disabled:cursor-default"
		>
			<AssetDisplay coin={token} hideName iconClassName="size-6" />
			{label}
			{!disabled && <CaretDownIcon weight="bold" className="size-3 text-fg-muted" />}
		</button>
	);
}
