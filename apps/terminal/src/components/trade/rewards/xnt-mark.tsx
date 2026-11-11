import { X1Mark } from "../header/x1-terminal-logo";

interface Props {
	size?: number;
}

export function XntMark({ size = 20 }: Props) {
	const scale = size / 20;
	return (
		<span
			className="inline-flex shrink-0 items-center justify-center rounded-full bg-control text-fg"
			style={{ width: size, height: size }}
		>
			<X1Mark className="block" style={{ width: 11 * scale, height: 7.5 * scale }} />
		</span>
	);
}
