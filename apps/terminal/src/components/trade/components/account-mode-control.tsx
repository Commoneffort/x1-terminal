import { Button, Modal, ModalContent, ModalDescription, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useConnection } from "wagmi";
import { autoTraderErrorMessage } from "@/lib/auto-trader/error-message";
import { cn } from "@/lib/cn";
import { getInfoClient, useExchange } from "@/lib/hyperliquid";
import { useIsTestnet } from "@/stores/use-global-settings-store";

type Mode = "disabled" | "unifiedAccount";

const OPTIONS = [
	{ value: "unifiedAccount", label: "Unified", description: "One shared balance for spot and perps." },
	{
		value: "disabled",
		label: "Manual",
		description: "Separate spot and perps balances. You move funds between them.",
	},
] as const;

function modeLabel(mode: string | undefined) {
	if (mode === "unifiedAccount") return "Unified";
	if (mode === "portfolioMargin") return "Portfolio";
	if (mode === "dexAbstraction") return "Legacy DEX";
	if (mode === "default" || mode === "disabled") return "Manual";
	return "Loading…";
}

function submitLabel(pending: boolean, same: boolean, target: string) {
	if (pending) return "Confirm in wallet…";
	if (same) return `${target} mode active`;
	return `Switch to ${target}`;
}

function isCurrent(option: Mode, mode: string | undefined) {
	if (option === "disabled") return mode === "disabled" || mode === "default";
	return mode === option;
}

export function AccountModeControl() {
	const { address, isConnected } = useConnection();
	const { pathname } = useLocation();
	const testnet = useIsTestnet();
	if (!isConnected || !address) return null;
	return (
		<AccountModeContent
			key={`${address}:${testnet}`}
			address={address}
			testnet={testnet}
			preferredMode={pathname === "/newtheme" ? "unifiedAccount" : undefined}
		/>
	);
}

function AccountModeContent({
	address,
	testnet,
	preferredMode,
}: {
	address: `0x${string}`;
	testnet: boolean;
	preferredMode?: Mode;
}) {
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<Mode>(preferredMode ?? "disabled");
	const popup = useRef<HTMLDivElement>(null);
	const mode = useQuery({
		queryKey: ["account-mode", address, testnet],
		queryFn: ({ signal }) => getInfoClient().userAbstraction({ user: address }, signal),
		staleTime: 10_000,
		refetchInterval: 15_000,
		retry: 1,
	});
	const change = useExchange("userSetAbstraction");
	const current = modeLabel(mode.data);
	const target = selected === "disabled" ? "Manual" : "Unified";
	const same = isCurrent(selected, mode.data);

	async function submit() {
		if (!mode.data || same || change.isPending) return;
		try {
			await change.mutateAsync({ user: address, abstraction: selected });
			await mode.refetch();
			toast.success(`${target} mode is active.`);
			setOpen(false);
		} catch (cause) {
			toast.error(autoTraderErrorMessage(cause));
		}
	}

	function openDialog() {
		setSelected(preferredMode ?? (mode.data === "unifiedAccount" ? "unifiedAccount" : "disabled"));
		setOpen(true);
		void mode.refetch();
	}

	return (
		<>
			<Button
				variant="secondary"
				intent="neutral"
				size="sm"
				aria-label={`Account mode: ${mode.isError ? "unavailable" : current}`}
				className="gap-2 whitespace-nowrap"
				onClick={openDialog}
			>
				{mode.isError ? "Retry" : current}
				<CaretDownIcon size={12} weight="bold" className="shrink-0 text-fg-muted" aria-hidden="true" />
			</Button>
			<Modal
				open={open}
				onOpenChange={(value) => {
					if (!change.isPending) setOpen(value);
				}}
			>
				<ModalPopup ref={popup} initialFocus={popup} size="sm" showClose={!change.isPending}>
					<ModalHeader>
						<ModalTitle>Account mode</ModalTitle>
						<ModalDescription>Current mode: {mode.isError ? "Unavailable" : current}</ModalDescription>
					</ModalHeader>
					<ModalContent className="flex flex-col gap-3">
						<fieldset disabled={change.isPending} className="flex flex-col gap-2">
							<legend className="sr-only">Choose account mode</legend>
							{OPTIONS.map((option) => {
								const checked = selected === option.value;
								return (
									<label
										key={option.value}
										className={cn(
											"flex cursor-pointer items-start gap-3 rounded-8 p-3 transition-colors",
											"has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-stroke-focus",
											checked ? "bg-control-hover" : "bg-control hover:bg-control-hover",
										)}
									>
										<input
											type="radio"
											name="account-mode"
											value={option.value}
											checked={checked}
											onChange={() => setSelected(option.value)}
											className="sr-only"
										/>
										<span
											aria-hidden="true"
											className={cn(
												"mt-0.5 grid size-4 shrink-0 place-items-center rounded-full transition-colors",
												checked ? "bg-fg" : "bg-background",
											)}
										>
											{checked && <span className="size-1.5 rounded-full bg-background" />}
										</span>
										<span className="flex min-w-0 flex-col gap-1">
											<span className="flex items-center gap-2 text-sm font-medium">
												{option.label}
												{isCurrent(option.value, mode.data) && (
													<span className="rounded-4 bg-background px-1.5 py-0.5 text-2xs font-normal text-fg-muted">
														Current
													</span>
												)}
											</span>
											<span className="text-xs text-fg-muted">{option.description}</span>
										</span>
									</label>
								);
							})}
						</fieldset>
						<p className="text-xs text-fg-muted">
							Applies to {address.slice(0, 6)}…{address.slice(-4)}. A wallet signature is required.
						</p>
						{mode.isError && (
							<button
								type="button"
								onClick={() => void mode.refetch()}
								className="self-start text-xs text-fg-secondary"
							>
								Could not read the account mode. Retry
							</button>
						)}
						<Button size="md" className="w-full" disabled={!mode.data || same || change.isPending} onClick={submit}>
							{submitLabel(change.isPending, same, target)}
						</Button>
					</ModalContent>
				</ModalPopup>
			</Modal>
		</>
	);
}
