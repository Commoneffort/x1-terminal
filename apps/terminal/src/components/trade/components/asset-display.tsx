import { Avatar } from "@hypeterminal/ui";
import type { ReactNode } from "react";
import { useIconBacking } from "@/hooks/ui/use-icon-backing";
import { cn } from "@/lib/cn";
import type { SpotToken, UnifiedMarket } from "@/lib/hyperliquid/markets";
import { useMarkets } from "@/lib/hyperliquid/markets/use-markets";

interface Props {
	coin: string;
	iconUrl?: string;
	variant?: "short" | "full";
	subtitle?: ReactNode;
	hideIcon?: boolean;
	hideName?: boolean;
	className?: string;
	iconClassName?: string;
	nameClassName?: string;
	subtitleClassName?: string;
}

function resolveName(
	market: UnifiedMarket | undefined,
	token: SpotToken | undefined,
	coin: string,
	variant: "short" | "full" | undefined,
): string {
	if (market) {
		if (variant === "full") return market.pairName;
		if (variant === "short") return market.shortName;
		return market.kind === "spot" ? market.pairName : market.shortName;
	}
	if (token) return token.displayName;
	return coin;
}

function resolveIconUrl(market: UnifiedMarket | undefined, token: SpotToken | undefined): string | undefined {
	return market?.iconUrl ?? token?.iconUrl;
}

const BACKING_CLASS = {
	light: "rounded-full bg-white [&_img]:scale-[0.72]",
	dark: "rounded-full bg-background [&_img]:scale-[0.72]",
} as const;

function getFallbackText(name: string): string {
	return (name.split(":").at(-1) ?? name).slice(0, 1).toUpperCase();
}

export function AssetDisplay({
	coin,
	iconUrl: iconUrlOverride,
	variant,
	subtitle,
	hideIcon = false,
	hideName = false,
	className,
	iconClassName,
	nameClassName,
	subtitleClassName,
}: Props) {
	const markets = useMarkets();
	const market = markets.getMarket(coin);
	const token = !market ? markets.getToken(coin) : undefined;

	const showIcon = !hideIcon;
	const showName = !hideName;
	const name = resolveName(market, token, coin, variant);
	const iconUrl = iconUrlOverride ?? resolveIconUrl(market, token);
	const fallbackText = getFallbackText(name);
	const backing = useIconBacking(showIcon ? iconUrl : undefined);

	const icon = (
		<Avatar
			className={cn("size-4", iconClassName, backing && BACKING_CLASS[backing])}
			size="sm"
			src={iconUrl}
			alt={name}
			initials={fallbackText}
		/>
	);

	if (showIcon && !showName) {
		return (
			<span className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}>{icon}</span>
		);
	}

	if (!showIcon && showName) {
		return <span className={cn(nameClassName, className)}>{name}</span>;
	}

	if (!showIcon && !showName) {
		return null;
	}

	return (
		<span className={cn("inline-flex items-center gap-1", className)}>
			{icon}
			{subtitle ? (
				<span className="flex flex-col items-start">
					<span className={nameClassName}>{name}</span>
					<span className={subtitleClassName}>{subtitle}</span>
				</span>
			) : (
				<span className={nameClassName}>{name}</span>
			)}
		</span>
	);
}
