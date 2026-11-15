import { RabbyIcon } from "@/components/icons/rabby-icon";
import { X1Tile } from "../header/x1-terminal-logo";

interface Props {
	connector: { id: string; icon?: string } | undefined;
	size: number;
}

export function WalletLogo({ connector, size }: Props) {
	if (!connector) return null;
	const radius = Math.round(size * 0.26);
	if (connector.id === "x1") return <X1Tile size={size} />;
	if (connector.id === "rabby")
		return (
			<span className="block shrink-0 overflow-hidden" style={{ width: size, height: size, borderRadius: radius }}>
				<RabbyIcon className="block size-full" />
			</span>
		);
	const src = connector.id === "phantom" ? "/wallets/phantom.svg" : connector.icon;
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
