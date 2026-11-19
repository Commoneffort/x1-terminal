import { Button } from "@hypeterminal/ui";
import { CheckIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { AUTO_TRADER_MIN_EQUITY } from "@/config/auto-trader";
import { type SetupStep, useAutoTraderSetup } from "@/hooks/use-auto-trader-setup";
import { cn } from "@/lib/cn";
import { formatUSD } from "@/lib/format";
import { useDepositModalActions } from "@/stores/use-global-modal-store";
import { AutoExistingWallet } from "./auto-existing-wallet";

interface StepProps {
	n: number;
	done: boolean;
	current: boolean;
	title: string;
	detail: string;
}

function Step({ n, done, current, title, detail }: StepProps) {
	return (
		<li className="flex gap-3">
			<span
				className={cn(
					"grid size-5 shrink-0 place-items-center rounded-full text-2xs font-medium tabular-nums",
					done && "bg-success-soft text-market-up",
					!done && current && "bg-fill text-fg-inverse",
					!done && !current && "bg-control text-fg-muted",
				)}
			>
				{done ? <CheckIcon weight="bold" className="size-3" /> : n}
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className={cn("text-xs font-medium", !done && !current && "text-fg-muted")}>{title}</span>
				<span className="text-xs text-fg-muted">{detail}</span>
			</div>
		</li>
	);
}

export function AutoSetup() {
	const setup = useAutoTraderSetup();
	const [existing, setExisting] = useState(false);
	const { open: openDeposit } = useDepositModalActions();
	const spinner = (step: SetupStep) =>
		setup.busy === step ? <SpinnerGapIcon className="size-4 animate-spin" /> : undefined;
	const action = getAction(setup.current, {
		fee: setup.approve,
		funds: () => openDeposit("deposit"),
		key: setup.createKey,
	});
	const fundsDetail =
		setup.equity === null
			? `Auto Trader needs ${formatUSD(AUTO_TRADER_MIN_EQUITY, 0)} or more in this account.`
			: `${formatUSD(setup.equity)} now. Auto Trader needs ${formatUSD(AUTO_TRADER_MIN_EQUITY, 0)} or more.`;

	return (
		<div className="flex flex-col gap-4 px-3 pt-4 pb-3">
			<p className="text-xs text-fg-muted">
				Auto Trader follows the Mood Ring signal. It trades this account about every 5 minutes, inside the limits you
				set. Your funds stay in your Hyperliquid account.
			</p>
			<ol className="flex flex-col gap-4">
				<Step
					n={1}
					done={setup.feeDone}
					current={setup.current === "fee"}
					title="Approve the builder fee"
					detail="0.05% on each Auto Trader fill, plus exchange fees."
				/>
				<Step
					n={2}
					done={setup.fundsDone}
					current={setup.current === "funds"}
					title="Fund the account"
					detail={setup.portfolioMargin ? "Portfolio margin accounts are not supported." : fundsDetail}
				/>
				<Step
					n={3}
					done={false}
					current={setup.current === "key"}
					title="Create the Auto Trader key"
					detail="Two wallet signatures. The key can trade but cannot withdraw. Auto Trader starts paused."
				/>
			</ol>
			{existing && setup.current === "key" ? (
				<AutoExistingWallet setup={setup} onCancel={() => setExisting(false)} />
			) : (
				<Button
					variant="filled"
					intent="brand"
					size="md"
					className="w-full"
					onClick={action.run}
					disabled={setup.busy !== null || (action.needsBuilder && !setup.configured)}
					iconLeft={spinner(setup.current)}
				>
					{action.label}
				</Button>
			)}
			{!existing && setup.current === "key" && (
				<button
					type="button"
					onClick={() => setExisting(true)}
					className="self-center text-xs text-fg-secondary transition-colors hover:text-fg"
				>
					Use an existing API wallet
				</button>
			)}
			{!setup.configured && (
				<p className="text-xs text-market-down">This terminal's builder does not match the Auto Trader service.</p>
			)}
		</div>
	);
}

function getAction(step: SetupStep, handlers: Record<SetupStep, () => void>) {
	if (step === "fee") return { label: "Approve fee", run: handlers.fee, needsBuilder: true };
	if (step === "funds") return { label: "Deposit", run: handlers.funds, needsBuilder: false };
	return { label: "Create key", run: handlers.key, needsBuilder: true };
}
