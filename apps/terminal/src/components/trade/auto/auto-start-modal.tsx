import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";

interface Props {
	open: boolean;
	settings: AutoTraderSettings;
	marketCount: number;
	onCancel: () => void;
	onConfirm: () => void;
}

export function AutoStartModal({ open, settings, marketCount, onCancel, onConfirm }: Props) {
	return (
		<Modal open={open} onOpenChange={(next) => !next && onCancel()}>
			<ModalPopup size="sm">
				<ModalHeader>
					<ModalTitle>Start Auto Trader?</ModalTitle>
				</ModalHeader>
				<ModalContent className="flex flex-col gap-4">
					<p className="text-sm text-fg-secondary">
						Auto Trader trades this account about every 5 minutes with your saved settings: {settings.leverage}x
						leverage, {Number((settings.killPct * 100).toFixed(2))}% daily loss stop and ${settings.minOrderUsd} minimum
						order.
					</p>
					<p className="text-sm text-fg-secondary">
						It resizes positions in its {marketCount} markets, including positions you open by hand. Trading can lose
						money.
					</p>
					<div className="grid grid-cols-2 gap-2">
						<Button variant="secondary" intent="neutral" size="md" onClick={onCancel}>
							Cancel
						</Button>
						<Button variant="filled" intent="brand" size="md" onClick={onConfirm}>
							Start
						</Button>
					</div>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
