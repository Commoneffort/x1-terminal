import { AssetDisplay } from "@/components/trade/components/asset-display";

export function AutoIconStack({ coins, max = 4, size = "size-5" }: { coins: string[]; max?: number; size?: string }) {
	const shown = coins.slice(0, max);
	return (
		<span className="flex items-center [--stack-bg:var(--color-control)] group-hover:[--stack-bg:var(--color-control-hover)]">
			{shown.map((coin, i) => (
				<span
					key={coin}
					className="relative inline-flex shrink-0 rounded-full bg-(--stack-bg) ring-2 ring-(--stack-bg) transition-[box-shadow,background-color]"
					style={{ marginLeft: i ? -6 : 0, zIndex: max - i }}
				>
					<AssetDisplay coin={coin} hideName iconClassName={size} />
				</span>
			))}
		</span>
	);
}
