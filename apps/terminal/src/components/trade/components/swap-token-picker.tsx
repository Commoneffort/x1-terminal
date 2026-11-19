import { CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatToken } from "@/lib/format";
import type { SpotToken } from "@/lib/hyperliquid/markets";
import { searchSwapTokens } from "@/lib/trade/swap-token-search";
import { AssetDisplay } from "./asset-display";

interface Props {
	tokens: SpotToken[];
	selected: string;
	getBalance: (token: string) => number;
	onSelect: (token: string) => void;
}

export function SwapTokenPicker({ tokens, selected, getBalance, onSelect }: Props) {
	const [query, setQuery] = useState("");
	const results = searchSwapTokens(tokens, query, getBalance);
	return (
		<div className="flex flex-col gap-3">
			<label className="flex h-10 items-center gap-2 rounded-8 bg-control px-3 focus-within:bg-control-hover">
				<MagnifyingGlassIcon className="size-4 shrink-0 text-fg-muted" />
				<input
					// biome-ignore lint/a11y/noAutofocus: the picker opens for searching
					autoFocus
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by name or symbol"
					aria-label="Search tokens"
					className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
				/>
			</label>
			<div className="-mx-2 flex max-h-[360px] flex-col overflow-y-auto">
				{results.length === 0 && <p className="px-2 py-6 text-center text-xs text-fg-muted">No tokens match.</p>}
				{results.map((token) => {
					const balance = getBalance(token.name);
					const active = token.name === selected;
					return (
						<button
							key={token.name}
							type="button"
							onClick={() => onSelect(token.name)}
							className={cn(
								"flex items-center gap-3 rounded-8 px-2 py-2 text-left transition-colors hover:bg-control-hover",
								active && "bg-control-hover",
							)}
						>
							<AssetDisplay coin={token.name} hideName iconClassName="size-8" />
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="text-sm font-medium">{token.displayName}</span>
								{token.fullName && <span className="truncate text-xs text-fg-muted">{token.fullName}</span>}
							</span>
							{balance > 0 && (
								<span className="shrink-0 text-xs tabular-nums text-fg-secondary">{formatToken(balance, 4)}</span>
							)}
							{active && <CheckIcon weight="bold" className="size-3.5 shrink-0 text-fg" />}
						</button>
					);
				})}
			</div>
		</div>
	);
}
