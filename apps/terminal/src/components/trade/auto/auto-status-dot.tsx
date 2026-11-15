import type { PhaseTone } from "@/lib/auto-trader/phase";
import { cn } from "@/lib/cn";

interface Props {
	tone: PhaseTone;
	className?: string;
}

export function AutoStatusDot({ tone, className }: Props) {
	return (
		<span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden="true">
			{tone === "on" && <span className="absolute inset-0 animate-ping rounded-full bg-market-up opacity-60" />}
			<span
				className={cn(
					"relative size-2 rounded-full",
					tone === "on" && "bg-market-up",
					tone === "alert" && "bg-warning",
					tone === "off" && "bg-fg-disabled",
				)}
			/>
		</span>
	);
}
