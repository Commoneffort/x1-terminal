import { useEffect, useMemo } from "react";
import { HL_ALL_DEXS } from "@/config/app";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { positionLineStyle, staggerOffsets } from "@/lib/chart/position-line-style";
import { colorToHex, getChartColors } from "@/lib/chart/theme-colors";
import { buildTradingLines, getTradingLineColor } from "@/lib/chart/trading-lines";
import { useSubscription, useUserPositions } from "@/lib/hyperliquid";
import { getOrderLineLabel } from "@/lib/trade/open-orders";
import { useChartMarksStore } from "@/stores/use-chart-marks-store";
import type { IChartingLibraryWidget } from "@/types/charting_library";

export function useTradingViewLines(widget: IChartingLibraryWidget | null, symbol: string, dex?: string) {
	const hidden = useChartMarksStore((state) => state.hidden);
	const { address, isConnected } = useTradingAccount();
	const { getPosition } = useUserPositions();
	const position = isConnected ? (getPosition(symbol, dex) ?? getPosition(symbol.split(":").at(-1)!, dex)) : undefined;
	const { data } = useSubscription(
		"openOrders",
		{ user: address ?? "0x0", dex: HL_ALL_DEXS },
		{ enabled: isConnected && !!address },
	);
	const lines = useMemo(
		() =>
			!isConnected
				? []
				: buildTradingLines(
						symbol,
						position ?? undefined,
						(data && data.user?.toLowerCase() === address?.toLowerCase() ? data.orders : []).map((order) => ({
							...order,
							label: getOrderLineLabel(order),
						})),
					),
		[isConnected, address, symbol, position, data],
	);
	useEffect(() => {
		if (!widget || hidden) return;
		let active = true;
		const chart = widget.activeChart();
		const surface = colorToHex(getChartColors().background);
		const removers: (() => void)[] = [];
		const draw = () => {
			if (!active) return;
			let visible: number | null = null;
			try {
				const range = chart.getPanes()[0]?.getMainSourcePriceScale()?.getVisiblePriceRange();
				if (range) visible = Math.abs(range.to - range.from);
			} catch {
				visible = null;
			}
			const offsets = staggerOffsets(
				lines.map((line) => line.price),
				visible,
			);
			for (const [index, line] of lines.entries()) {
				const style = positionLineStyle(line, getTradingLineColor(line.tone), surface, offsets[index]);
				try {
					const adapter = chart
						.createPositionLine({ disableUndo: true })
						.setPrice(line.price)
						.setText(style.body)
						.setQuantity(style.qty)
						.setLineColor(style.color)
						.setLineStyle(0)
						.setLineWidth(1)
						.setLineLength(style.length)
						.setExtendLeft(true)
						.setBodyFont("600 12px Inter, sans-serif")
						.setQuantityFont("700 12px Inter, sans-serif")
						.setBodyBackgroundColor(style.surface)
						.setBodyBorderColor(style.color)
						.setBodyTextColor(style.color)
						.setQuantityBackgroundColor(style.surface)
						.setQuantityBorderColor(style.color)
						.setQuantityTextColor(style.color);
					removers.push(() => adapter.remove());
				} catch {
					/* Chart may not be ready for trading primitives. */
				}
			}
		};
		if (chart.dataReady()) draw();
		else chart.dataReady(draw);
		return () => {
			active = false;
			for (const remove of removers) {
				try {
					remove();
				} catch {
					/* Widget may already be disposed. */
				}
			}
		};
	}, [widget, lines, hidden]);
}
