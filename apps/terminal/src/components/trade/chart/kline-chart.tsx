import { t } from "@lingui/core/macro";
import type { Chart, KLineData } from "klinecharts";
import { dispose, FormatDateType, init, LoadDataType } from "klinecharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { type ChartTypeConfig, DEFAULT_CHART_TYPE, INITIAL_CANDLE_COUNT, VOLUME_INDICATOR_NAME } from "@/config/chart";
import { MS_PER_DAY } from "@/config/time";
import { candleEventToKLineData, candlesToKLineData } from "@/lib/chart/candle";
import { formatShortDate, formatTime, formatTooltipDate } from "@/lib/chart/format";
import { buildKlineStyles } from "@/lib/chart/kline-styles";
import { RESOLUTIONS } from "@/lib/chart/resolution";
import { browserChartTimezone } from "@/lib/chart/timezone";
import { getInfoClient, useSubscription } from "@/lib/hyperliquid";
import { setChartResolution, useChartIntervalStore } from "@/stores/use-chart-interval-store";
import { ChartMarksMenu } from "./chart-marks-menu";
import type { ChartSource, ChartSourceToggleIntentHandlers } from "./chart-source-toggle";
import { ChartStatus } from "./chart-status";
import { KlineToolbar } from "./kline-toolbar";
import { useKlineExecutions } from "./use-kline-executions";
import { useKlineTradingLines } from "./use-kline-trading-lines";

interface Props {
	symbol?: string;
	positionDex?: string;
	theme?: "light" | "dark";
	yAxisInside?: boolean;
	onChartSourceChange?: (source: ChartSource) => void;
	tradingViewIntentHandlers?: ChartSourceToggleIntentHandlers;
}

const CANDLE_FETCH_RETRY_DELAYS_MS = [750, 2_000] as const;

type CandleSnapshotParams = Parameters<ReturnType<typeof getInfoClient>["candleSnapshot"]>[0];

function delay(ms: number) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function logRecoverableCandleFetchFailure(label: string, err: unknown) {
	if (import.meta.env.DEV) {
		console.warn(`kline ${label} candle fetch failed`, err);
	}
}

async function fetchCandlesWithRetry(params: CandleSnapshotParams, shouldContinue: () => boolean) {
	let lastError: unknown;

	for (const retryDelayMs of [0, ...CANDLE_FETCH_RETRY_DELAYS_MS]) {
		if (!shouldContinue()) return [];
		// react-doctor-disable-next-line react-doctor/async-await-in-loop
		if (retryDelayMs > 0) await delay(retryDelayMs);
		if (!shouldContinue()) return [];

		try {
			return await getInfoClient().candleSnapshot(params);
		} catch (err) {
			lastError = err;
		}
	}

	throw lastError;
}

const BACKFILL_RETRY_MS = 5_000;
const GAP_BAR_FACTOR = 1.5;

interface LiveCandleFeed {
	push: (kline: KLineData) => void;
	dispose: () => void;
}

/**
 * The shared subscription store pauses market streams while the tab is hidden
 * and keeps only the latest candle, and a websocket reconnect resumes with the
 * current candle only. klinecharts appends any newer timestamp, so the skipped
 * bars become a hole. This feed holds live candles back and backfills from the
 * candle snapshot when the page returns after a bar boundary or a live candle
 * skips past the last bar.
 */
function createLiveCandleFeed(
	chart: Chart,
	coin: string,
	interval: { candleInterval: CandleSnapshotParams["interval"]; barMs: number },
	isActive: () => boolean,
): LiveCandleFeed {
	let hiddenAt: number | null = document.visibilityState === "hidden" ? Date.now() : null;
	let isBackfilling = false;
	let retryFrom: number | null = null;
	let retryAt = 0;
	let buffer: KLineData[] = [];

	function flush() {
		const pending = buffer;
		buffer = [];
		for (const kline of pending) chart.updateData(kline);
	}

	function backfill(from: number) {
		isBackfilling = true;
		retryFrom = null;
		fetchCandlesWithRetry({ coin, interval: interval.candleInterval, startTime: from, endTime: Date.now() }, isActive)
			.then((candles) => {
				const fetched = candlesToKLineData(candles);
				const first = fetched[0];
				if (!first || !isActive()) return;
				const kept = chart.getDataList().filter((kline) => kline.timestamp < first.timestamp);
				chart.applyNewData([...kept, ...fetched], true);
			})
			.catch((err) => {
				logRecoverableCandleFetchFailure("backfill", err);
				retryFrom = from;
				retryAt = Date.now() + BACKFILL_RETRY_MS;
			})
			.finally(() => {
				isBackfilling = false;
				if (isActive()) flush();
			});
	}

	function push(kline: KLineData) {
		if (retryFrom !== null && !isBackfilling && Date.now() >= retryAt) backfill(retryFrom);
		if (hiddenAt !== null || isBackfilling) {
			buffer.push(kline);
			return;
		}
		const last = chart.getDataList().at(-1);
		if (last && kline.timestamp - last.timestamp > interval.barMs * GAP_BAR_FACTOR) {
			buffer.push(kline);
			backfill(last.timestamp);
			return;
		}
		chart.updateData(kline);
	}

	function handleVisibilityChange() {
		if (document.visibilityState === "hidden") {
			hiddenAt ??= Date.now();
			return;
		}
		if (hiddenAt === null) return;
		const crossedBar = Math.floor(hiddenAt / interval.barMs) !== Math.floor(Date.now() / interval.barMs);
		hiddenAt = null;
		chart.resize();
		if (isBackfilling) return;
		const last = chart.getDataList().at(-1);
		if (crossedBar && last) {
			backfill(last.timestamp);
			return;
		}
		flush();
	}

	document.addEventListener("visibilitychange", handleVisibilityChange);

	return {
		push,
		dispose: () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			buffer = [];
		},
	};
}

export function KlineChart({
	symbol = "",
	positionDex,
	theme,
	yAxisInside = false,
	onChartSourceChange,
	tradingViewIntentHandlers,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<Chart | null>(null);
	const resolution = useChartIntervalStore((state) => state.resolution);
	const activeInterval = useMemo(() => ({ ...RESOLUTIONS[resolution], resolution }), [resolution]);
	const [activeChartType, setActiveChartType] = useState<ChartTypeConfig>(DEFAULT_CHART_TYPE);
	const activeCandleType = activeChartType.type;
	const loadKey = `${symbol}:${activeInterval.resolution}`;
	const [loadResult, setLoadResult] = useState<{ key: string; failed: boolean } | null>(null);
	const intervalRef = useRef(activeInterval);
	intervalRef.current = activeInterval;
	const liveFeedRef = useRef<LiveCandleFeed | null>(null);
	const chartStyleRef = useRef({ candleType: activeCandleType, yAxisInside });
	chartStyleRef.current = { candleType: activeCandleType, yAxisInside };

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !symbol) return;
		let disposed = false;

		const chart = init(container, {
			timezone: browserChartTimezone(),
			customApi: {
				formatDate: (_dateTimeFormat, timestamp, _format, type) => {
					const date = new Date(timestamp);
					if (type === FormatDateType.XAxis) {
						if (activeInterval.barMs >= MS_PER_DAY) return formatShortDate(date);
						if (date.getHours() === 0 && date.getMinutes() === 0) return formatShortDate(date);
						return formatTime(date);
					}
					return formatTooltipDate(date);
				},
			},
		});
		if (!chart) return;
		chartRef.current = chart;
		const liveFeed = createLiveCandleFeed(chart, symbol, activeInterval, () => !disposed && chartRef.current === chart);
		liveFeedRef.current = liveFeed;

		chart.setStyles(
			buildKlineStyles(chartStyleRef.current.candleType, { yAxisInside: chartStyleRef.current.yAxisInside }),
		);
		chart.createIndicator(VOLUME_INDICATOR_NAME);

		chart.setLoadDataCallback(({ type, data, callback }) => {
			const interval = intervalRef.current;

			if (type === LoadDataType.Forward && data) {
				const endTime = data.timestamp;
				const startTime = endTime - INITIAL_CANDLE_COUNT * interval.barMs;

				fetchCandlesWithRetry(
					{
						coin: symbol,
						interval: interval.candleInterval,
						startTime,
						endTime,
					},
					() => !disposed && chartRef.current === chart,
				)
					.then((candles) => callback(candlesToKLineData(candles), candles.length > 0))
					.catch((err) => {
						logRecoverableCandleFetchFailure("forward-load", err);
						callback([], false);
					});
			}

			if (type === LoadDataType.Backward) {
				callback([], false);
			}
		});

		const requestKey = `${symbol}:${activeInterval.resolution}`;
		const endTime = Date.now();
		const startTime = endTime - INITIAL_CANDLE_COUNT * activeInterval.barMs;

		fetchCandlesWithRetry(
			{
				coin: symbol,
				interval: activeInterval.candleInterval,
				startTime,
				endTime,
			},
			() => !disposed && chartRef.current === chart,
		)
			.then((candles) => {
				if (chartRef.current === chart) {
					chart.applyNewData(candlesToKLineData(candles), true);
					setLoadResult({ key: requestKey, failed: false });
				}
			})
			.catch((err) => {
				logRecoverableCandleFetchFailure("initial", err);
				if (chartRef.current === chart) {
					chart.applyNewData([], false);
					setLoadResult({ key: requestKey, failed: true });
				}
			});

		const ro = new ResizeObserver(() => chart.resize());
		ro.observe(container);

		return () => {
			disposed = true;
			ro.disconnect();
			chartRef.current = null;
			liveFeed.dispose();
			if (liveFeedRef.current === liveFeed) liveFeedRef.current = null;
			dispose(container);
		};
	}, [symbol, activeInterval]);

	useEffect(() => {
		const chart = chartRef.current;
		if (!chart) return;
		chart.setStyles(buildKlineStyles(activeCandleType, { yAxisInside, theme }));
	}, [activeCandleType, yAxisInside, theme]);

	const candleData = useSubscription(
		"candle",
		{ coin: symbol, interval: activeInterval.candleInterval },
		{ enabled: !!symbol },
	);

	useEffect(() => {
		const liveFeed = liveFeedRef.current;
		const event = candleData.data;
		if (!liveFeed || !event) return;

		const klineData = candleEventToKLineData(event);
		if (!klineData) return;

		liveFeed.push(klineData);
	}, [candleData.data]);

	const isLoading = loadResult?.key !== loadKey;
	const hasFailed = !isLoading && loadResult?.failed === true;
	const dataKey = isLoading || hasFailed ? null : loadKey;

	useKlineExecutions(chartRef, symbol, activeInterval.barMs, dataKey);
	useKlineTradingLines({ chartRef, symbol, dex: positionDex, dataKey });

	return (
		<div className="flex flex-col h-full">
			<KlineToolbar
				activeInterval={activeInterval}
				onIntervalChange={(interval) => setChartResolution(interval.resolution)}
				activeChartType={activeChartType}
				onChartTypeChange={setActiveChartType}
				onChartSourceChange={onChartSourceChange}
				tradingViewIntentHandlers={tradingViewIntentHandlers}
			/>
			<ChartMarksMenu>
				<div className="relative h-full min-h-0">
					<div ref={containerRef} className="absolute inset-0" />
					{isLoading ? <ChartStatus label={t`Loading`} pulse /> : null}
					{hasFailed ? <ChartStatus label={t`Failed to load chart.`} /> : null}
				</div>
			</ChartMarksMenu>
		</div>
	);
}
