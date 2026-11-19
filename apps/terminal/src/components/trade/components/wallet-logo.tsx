import { RabbyIcon } from "@/components/icons/rabby-icon";

const WALLET_ICONS: Record<string, string> = {
	x1: "/wallets/x1-wallet.svg",
	phantom: "/wallets/phantom.svg",
};

interface Props {
	connector: { id: string; icon?: string } | undefined;
	size: number;
}

export function WalletLogo({ connector, size }: Props) {
	if (!connector) return null;
	const radius = Math.round(size * 0.26);
	if (connector.id === "rabby")
		return (
			<span className="block shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: radius }}>
				<RabbyIcon className="block size-full" />
			</span>
		);
	const src = WALLET_ICONS[connector.id] ?? connector.icon;
	if (!src) return null;
	return (
		<img
			src={src}
			alt=""
			draggable={false}
			className="block shrink-0 object-contain"
			style={{ width: size, height: size, borderRadius: radius }}
		/>
	);
}
