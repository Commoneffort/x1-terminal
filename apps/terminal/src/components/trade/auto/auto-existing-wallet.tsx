import { Button } from "@hypeterminal/ui";
import { CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { Address } from "viem";
import type { useAutoTraderSetup } from "@/hooks/use-auto-trader-setup";
import { cn } from "@/lib/cn";

interface Props {
	setup: ReturnType<typeof useAutoTraderSetup>;
	onCancel: () => void;
}

function walletName(name: string | undefined | null) {
	return (name ?? "").replace(/ valid_until \d+$/, "") || "Unnamed wallet";
}

export function AutoExistingWallet({ setup, onCancel }: Props) {
	const [selected, setSelected] = useState<Address | null>(null);
	const [key, setKey] = useState("");
	const needsKey = !!selected && !setup.hasLocalKey(selected);
	return (
		<div className="flex flex-col gap-3">
			<p className="text-xs text-fg-muted">Choose an approved API wallet. Auto Trader stores its key encrypted.</p>
			{setup.apiWallets.length === 0 && (
				<p className="text-xs text-fg-muted">No approved API wallets on this account.</p>
			)}
			<div className="-mx-2 flex flex-col">
				{setup.apiWallets.map((row) => {
					const on = selected?.toLowerCase() === row.address.toLowerCase();
					return (
						<button
							key={row.address}
							type="button"
							onClick={() => setSelected(row.address)}
							className={cn(
								"flex items-center gap-3 rounded-8 px-2 py-2 text-left transition-colors hover:bg-control",
								on && "bg-control",
							)}
						>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate text-xs font-medium">{walletName(row.name)}</span>
								<span className="text-2xs text-fg-muted tabular-nums">
									{row.address.slice(0, 6)}…{row.address.slice(-4)} · expires{" "}
									{new Date(row.validUntil).toLocaleDateString([], { month: "short", day: "numeric" })}
								</span>
							</span>
							{on && <CheckIcon weight="bold" className="size-3.5 shrink-0" />}
						</button>
					);
				})}
			</div>
			{needsKey && (
				<label className="flex h-10 items-center gap-2 rounded-8 bg-control px-3 focus-within:bg-control-hover">
					<input
						type="password"
						autoComplete="off"
						value={key}
						onChange={(e) => setKey(e.target.value)}
						placeholder="Private key of this API wallet"
						aria-label="API wallet private key"
						className="min-w-0 flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-fg-muted"
					/>
				</label>
			)}
			<Button
				size="md"
				className="w-full"
				disabled={!selected || (needsKey && !key) || setup.busy !== null}
				onClick={() => selected && void setup.registerExisting(selected, key)}
			>
				Register API wallet
			</Button>
			<Button variant="ghost" intent="neutral" size="sm" className="w-full text-fg-muted" onClick={onCancel}>
				Create a new key instead
			</Button>
		</div>
	);
}
