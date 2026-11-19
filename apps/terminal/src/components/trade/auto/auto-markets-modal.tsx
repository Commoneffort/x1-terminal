import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import { CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { marketSupportNote } from "@/lib/auto-trader/market-support";
import { allowedMarkets, selectableMarkets } from "@/lib/auto-trader/targets";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
import { cn } from "@/lib/cn";
import { AssetDisplay } from "../components/asset-display";

interface Props {
	open: boolean;
	settings: AutoTraderSettings;
	universe: readonly string[];
	saving: boolean;
	onClose: () => void;
	onSave: (next: AutoTraderSettings) => void;
}

export function AutoMarketsModal({ open, settings, universe, saving, onClose, onSave }: Props) {
	return (
		<Modal open={open} onOpenChange={(next) => !next && !saving && onClose()}>
			<ModalPopup size="sm">
				<ModalHeader>
					<ModalTitle>Auto Trader markets</ModalTitle>
				</ModalHeader>
				{open && (
					<MarketsBody settings={settings} universe={universe} saving={saving} onClose={onClose} onSave={onSave} />
				)}
			</ModalPopup>
		</Modal>
	);
}

function MarketsBody({ settings, universe, saving, onClose, onSave }: Omit<Props, "open">) {
	const all = selectableMarkets(universe, settings);
	const [picked, setPicked] = useState(() => new Set(allowedMarkets(settings, universe)));
	function toggle(coin: string) {
		setPicked((prev) => {
			const next = new Set(prev);
			if (next.has(coin)) next.delete(coin);
			else next.add(coin);
			return next;
		});
	}
	return (
		<ModalContent className="flex flex-col gap-3">
			<div className="flex items-center justify-between text-xs text-fg-muted">
				<span>
					{picked.size} of {all.length} selected
				</span>
				<span className="flex gap-3">
					<button type="button" className="hover:text-fg" onClick={() => setPicked(new Set(all))}>
						Select all
					</button>
					<button type="button" className="hover:text-fg" onClick={() => setPicked(new Set())}>
						Clear
					</button>
				</span>
			</div>
			<div className="-mx-2 flex max-h-[360px] flex-col overflow-y-auto">
				{all.map((coin) => {
					const on = picked.has(coin);
					const note = marketSupportNote(coin, universe);
					return (
						<label
							key={coin}
							className="cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-stroke-focus flex items-center gap-3 rounded-8 px-2 py-2 text-left transition-colors hover:bg-control"
						>
							<input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(coin)} />
							<AssetDisplay coin={coin} hideName iconClassName="size-6" />
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="text-sm">{coin}</span>
								{note && <span className="text-xs text-fg-muted">{note}</span>}
							</span>
							<span
								className={cn(
									"grid size-5 shrink-0 place-items-center rounded-6 transition-colors",
									on ? "bg-fg text-background" : "bg-control-hover",
								)}
							>
								{on && <CheckIcon weight="bold" className="size-3" />}
							</span>
						</label>
					);
				})}
			</div>
			<p className="text-xs text-fg-muted">Auto Trader resizes positions only in the markets you select.</p>
			<Button
				size="md"
				className="w-full"
				disabled={saving || picked.size === 0}
				onClick={() => onSave({ ...settings, include: all.filter((c) => picked.has(c)), exclude: [] })}
			>
				{saving ? "Confirm in wallet…" : "Save markets"}
			</Button>
			<Button
				variant="ghost"
				intent="neutral"
				size="sm"
				className="w-full text-fg-muted"
				onClick={onClose}
				disabled={saving}
			>
				Cancel
			</Button>
		</ModalContent>
	);
}
