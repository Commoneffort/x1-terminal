import { Button, Dropdown } from "@hypeterminal/ui";
import {
	ArrowClockwiseIcon,
	CodeIcon,
	EyeIcon,
	KeyIcon,
	RobotIcon,
	SignOutIcon,
	SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { useIsMutating } from "@tanstack/react-query";
import { useState } from "react";
import { zeroAddress } from "viem";
import { useConnection, useDisconnect } from "wagmi";
import { CopyStateIcon } from "@/components/ui/copy-state-icon";
import { APP_BAR_BUTTON_HEIGHT_CLASS } from "@/config/layout";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { useXntRewards } from "@/hooks/use-xnt-rewards";
import { cn } from "@/lib/cn";
import { exitDemoMode } from "@/lib/demo/demo-mode";
import { formatToken, formatUSD } from "@/lib/format";
import { removeAgentFromStorage, useInfo } from "@/lib/hyperliquid";
import { getNetwork } from "@/lib/network";
import { feeDecimals, feesToXnt } from "@/lib/rewards/xnt-rewards";
import { clearX1Session } from "@/lib/x1/provider";
import { useGlobalSettingsActions } from "@/stores/use-global-settings-store";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { setTradeMode } from "@/stores/use-trade-mode-store";
import { useTradingAccountStore } from "@/stores/use-trading-account-store";
import { AccountModeControl } from "../components/account-mode-control";
import { ExportKeyModal } from "../components/export-key-modal";
import { WalletLogo } from "../components/wallet-logo";
import { WalletModal } from "../components/wallet-modal";
import { XntMark } from "../rewards/xnt-mark";
import { XntRewardsDrawer } from "../rewards/xnt-rewards-drawer";

export function UserMenu() {
	const { address, isConnected, connector } = useConnection();
	const { mutate: disconnect } = useDisconnect();
	const active = useTradingAccount();
	const mutating = useIsMutating() > 0;
	const select = useTradingAccountStore((s) => s.select);
	const { resetForm } = useOrderEntryActions();
	const { setMobileActiveTab } = useGlobalSettingsActions();
	const subaccounts = useInfo(
		"subAccounts",
		{ user: address ?? zeroAddress },
		{ enabled: isConnected && !!address, refetchOnWindowFocus: true, refetchInterval: 30000 },
	);
	const [open, setOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
	const [rewardsOpen, setRewardsOpen] = useState(false);
	const rewards = useXntRewards();
	const { copied, copy } = useCopyToClipboard();

	if (!isConnected || !address) {
		return (
			<>
				<Button
					variant="filled"
					intent="brand"
					size="sm"
					onClick={() => setOpen(true)}
					className={cn(APP_BAR_BUTTON_HEIGHT_CLASS, "text-sm font-semibold")}
				>
					Connect Wallet
				</Button>
				<WalletModal open={open} onOpenChange={setOpen} />
			</>
		);
	}

	const owner = address;
	const derived = connector?.id === "x1";
	const demo = connector?.type === "mock";
	const walletName = getWalletName(derived, connector);
	const activeAddress = active.address ?? owner;
	const rows = (subaccounts.data ?? []).filter((row) => row.master.toLowerCase() === owner.toLowerCase());

	function choose(account: (typeof rows)[number] | null) {
		select(account ? { owner, network: getNetwork(), address: account.subAccountUser, name: account.name } : null);
		resetForm();
	}

	function handleDisconnect() {
		select(null);
		if (demo) {
			disconnect();
			exitDemoMode();
			return;
		}
		removeAgentFromStorage("Testnet", owner);
		removeAgentFromStorage("Mainnet", owner);
		clearX1Session();
		disconnect();
	}

	const accountRows = rows.length
		? [
				{
					label: `Main account (${shortAddress(owner)})`,
					active: !active.isSubaccount,
					disabled: mutating,
					onSelect: () => choose(null),
				},
				...rows.map((row) => ({
					label: `${row.name} (${shortAddress(row.subAccountUser)})`,
					active: activeAddress.toLowerCase() === row.subAccountUser.toLowerCase(),
					disabled: subaccounts.isError || mutating,
					onSelect: () => choose(row),
				})),
			]
		: [];
	const accountRetry = subaccounts.isError
		? [
				{
					label: "Retry loading subaccounts",
					icon: <ArrowClockwiseIcon className="size-4" />,
					closeOnClick: false,
					onSelect: () => {
						void subaccounts.refetch();
					},
				},
			]
		: [];

	const actionItems = [
		{
			label: "XNT rewards",
			icon: <XntMark size={16} />,
			detail: rewardsDetail(rewards.data?.total),
			onSelect: () => setRewardsOpen(true),
		},
		{
			label: "Auto Trader",
			icon: <RobotIcon className="size-4" />,
			onSelect: () => {
				setTradeMode("auto");
				setMobileActiveTab("trade");
			},
		},
		{
			label: "API wallets",
			icon: <CodeIcon className="size-4" />,
			onSelect: () => window.location.assign("/API"),
		},
		{
			label: "Trading setup",
			icon: <SlidersHorizontalIcon className="size-4" />,
			detail: "0.05% fee",
			onSelect: () => window.dispatchEvent(new Event("x1:setup")),
		},
		...(derived
			? [
					{
						label: "Export private key",
						icon: <KeyIcon className="size-4" />,
						onSelect: () => setExportOpen(true),
					},
				]
			: []),
	];

	const header = (
		<div className="flex items-center gap-3 px-2 pt-1.5 pb-2">
			{demo ? (
				<span className="grid size-8 shrink-0 place-items-center rounded-8 bg-control-hover text-fg-muted">
					<EyeIcon className="size-4" />
				</span>
			) : (
				<WalletLogo connector={connector} size={32} />
			)}
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-sm font-medium tabular-nums">
					{active.subaccount?.name ?? shortAddress(activeAddress)}
				</span>
				<span className="truncate text-xs text-fg-muted">{getAccountLabel(derived, demo, walletName)}</span>
			</span>
			<button
				type="button"
				onClick={() => void copy(activeAddress)}
				aria-label="Copy address"
				className="grid size-8 shrink-0 place-items-center rounded-8 text-fg-muted transition-colors hover:bg-control-hover hover:text-fg"
			>
				<CopyStateIcon copied={copied} announcement="Address copied" />
			</button>
		</div>
	);

	return (
		<>
			{!active.isSubaccount && <AccountModeControl />}
			<Dropdown
				align="end"
				size="sm"
				triggerAriaLabel="Account and wallet"
				triggerClassName="tabular-nums max-md:h-8 max-md:px-2.5 max-md:[&>svg:last-child]:hidden"
				trigger={
					<span className="inline-flex max-w-56 items-center gap-2 whitespace-nowrap">
						<WalletLabel connector={connector} demo={demo} name={active.subaccount?.name} />
						<span>
							{activeAddress.slice(0, 4)}
							<span className="max-md:hidden">{activeAddress.slice(4, 6)}</span>…{activeAddress.slice(-4)}
						</span>
					</span>
				}
				popupClassName="max-h-none min-w-64"
				header={header}
				items={[...accountRows, ...accountRetry]}
				groups={[
					{ items: actionItems },
					{
						items: [
							{
								label: demo ? "Exit demo mode" : "Disconnect",
								icon: <SignOutIcon className="size-4" />,
								onSelect: handleDisconnect,
							},
						],
					},
				]}
			/>
			<XntRewardsDrawer open={rewardsOpen} onOpenChange={setRewardsOpen} />
			{derived && exportOpen && <ExportKeyModal key={owner} address={owner} onClose={() => setExportOpen(false)} />}
		</>
	);
}

function rewardsDetail(total: string | undefined) {
	if (total === undefined) return undefined;
	const xnt = feesToXnt(total);
	if (xnt) return formatToken(xnt, { decimals: 2, symbol: "XNT" });
	return formatUSD(total, feeDecimals(total));
}

function shortAddress(address: string) {
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getWalletName(derived: boolean, connector: { id: string; name: string } | undefined) {
	if (derived) return "X1";
	if (connector?.id === "rabby") return "Rabby";
	return connector?.name ?? "Wallet";
}

interface WalletLabelProps {
	connector: { id: string; icon?: string } | undefined;
	demo: boolean;
	name: string | undefined;
}

function WalletLabel({ connector, demo, name }: WalletLabelProps) {
	if (demo) return <span className="rounded-4 bg-control-hover px-1.5 py-0.5 text-2xs text-fg-secondary">Demo</span>;
	return (
		<>
			<WalletLogo connector={connector} size={18} />
			{name && <span className="truncate text-fg-muted max-md:hidden">{name}</span>}
		</>
	);
}

function getAccountLabel(derived: boolean, demo: boolean, walletName: string) {
	if (demo) return "Read-only demo account";
	if (derived) return "X1 Wallet derived key";
	return walletName;
}
