import { Button, Modal, ModalContent, ModalHeader, ModalPopup, ModalTitle } from "@hypeterminal/ui";

interface Props {
	open: boolean;
	title: string;
	body: string;
	confirmLabel: string;
	onCancel: () => void;
	onConfirm: () => void;
}

export function AutoConfirmModal({ open, title, body, confirmLabel, onCancel, onConfirm }: Props) {
	return (
		<Modal open={open} onOpenChange={(next) => !next && onCancel()}>
			<ModalPopup size="sm">
				<ModalHeader>
					<ModalTitle>{title}</ModalTitle>
				</ModalHeader>
				<ModalContent className="flex flex-col gap-4">
					<p className="text-sm text-fg-secondary">{body}</p>
					<div className="grid grid-cols-2 gap-2">
						<Button variant="secondary" intent="neutral" size="md" onClick={onCancel}>
							Cancel
						</Button>
						<Button variant="filled" intent="brand" size="md" onClick={onConfirm}>
							{confirmLabel}
						</Button>
					</div>
				</ModalContent>
			</ModalPopup>
		</Modal>
	);
}
