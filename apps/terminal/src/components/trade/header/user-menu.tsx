import { Button, Dropdown } from "@hypeterminal/ui";
import {
	ArrowClockwiseIcon,
	CodeIcon,
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
import { cn } from "@/lib/cn";
import { exitDemoMode } from "@/lib/demo/demo-mode";
import { removeAgentFromStorage, useInfo } from "@/lib/hyperliquid";
import { getNetwork } from "@/lib/network";
import { clearX1Session } from "@/lib/x1/provider";
import { useOrderEntryActions } from "@/stores/use-order-entry-store";
import { useTradingAccountStore } from "@/stores/use-trading-account-store";
import { AccountModeControl } from "../components/account-mode-control";
import { ExportKeyModal } from "../components/export-key-modal";
import { WalletModal } from "../components/wallet-modal";
import { X1Tile } from "./x1-terminal-logo";

export function UserMenu() {
	const { address, isConnected, connector } = useConnection();
	const { mutate: disconnect } = useDisconnect();
	const active = useTradingAccount();
	const mutating = useIsMutating() > 0;
	const select = useTradingAccountStore((s) => s.select);
	const { resetForm } = useOrderEntryActions();
	const subaccounts = useInfo(
		"subAccounts",
		{ user: address ?? zeroAddress },
		{ enabled: isConnected && !!address, refetchOnWindowFocus: true, refetchInterval: 30000 },
	);
	const [open, setOpen] = useState(false);
	const [exportOpen, setExportOpen] = useState(false);
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

	const switchItems = [
		{
			label: `Main account · ${shortAddress(owner)}`,
			active: !active.isSubaccount,
			disabled: mutating,
			onSelect: () => choose(null),
		},
		...rows.map((row) => ({
			label: `${row.name} · ${shortAddress(row.subAccountUser)}`,
			active: activeAddress.toLowerCase() === row.subAccountUser.toLowerCase(),
			disabled: subaccounts.isError || mutating,
			onSelect: () => choose(row),
		})),
		...(subaccounts.isLoading ? [{ label: "Loading subaccounts…", disabled: true }] : []),
		{
			label: subaccounts.isError ? "Retry loading subaccounts" : "Refresh subaccounts",
			icon: <ArrowClockwiseIcon className="size-4" />,
			closeOnClick: false,
			onSelect: () => {
				void subaccounts.refetch();
			},
		},
	];

	const accountItems = [
		{
			label: `Copy ${activeAddress}`,
			icon: <CopyStateIcon copied={copied} announcement="Address copied" />,
			closeOnClick: false,
			onSelect: () => {
				void copy(activeAddress);
			},
		},
		{
			label: "Auto Trader",
			icon: <RobotIcon className="size-4" />,
			onSelect: () => window.location.assign("/API#auto-trader"),
		},
		{
			label: "API wallets",
			icon: <CodeIcon className="size-4" />,
			onSelect: () => window.location.assign("/API"),
		},
		{
			label: "Trading setup · 0.05% fee",
			icon: <SlidersHorizontalIcon className="size-4" />,
			onSelect: () => window.dispatchEvent(new Event("x1:setup")),
		},
		...(derived
			? [
					{
						label: "Export derived private key",
						icon: <KeyIcon className="size-4" />,
						onSelect: () => setExportOpen(true),
					},
				]
			: []),
	];

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
						<WalletLabel derived={derived} demo={demo} name={active.subaccount?.name ?? walletName} />
						<span>
							{activeAddress.slice(0, 4)}
							<span className="max-md:hidden">{activeAddress.slice(4, 6)}</span>…{activeAddress.slice(-4)}
						</span>
					</span>
				}
				popupClassName="max-h-none"
				items={switchItems}
				groups={[
					{
						label: getAccountLabel(derived, demo, walletName),
						items: accountItems,
					},
					{
						items: [
							{
								label: demo ? "Exit demo mode" : "Disconnect",
								icon: <SignOutIcon className="size-4" />,
								danger: true,
								onSelect: handleDisconnect,
							},
						],
					},
				]}
			/>
			{derived && exportOpen && <ExportKeyModal key={owner} address={owner} onClose={() => setExportOpen(false)} />}
		</>
	);
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
	derived: boolean;
	demo: boolean;
	name: string;
}

function WalletLabel({ derived, demo, name }: WalletLabelProps) {
	if (demo) return null;
	if (derived && name === "X1") return <X1Tile size={18} />;
	return <span className="truncate text-fg-muted max-md:hidden">{name}</span>;
}

function getAccountLabel(derived: boolean, demo: boolean, walletName: string) {
	if (demo) return "Demo · read-only public account";
	if (derived) return "Derived from your X1 signature";
	return `${walletName} Ethereum account`;
}
