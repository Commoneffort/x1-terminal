import { Button, Slider } from "@hypeterminal/ui";
import { useState } from "react";
import { NumberInput } from "@/components/ui/number-input";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";

interface Props {
	saved: AutoTraderSettings;
	saving: boolean;
	disabled: boolean;
	onSave: (next: AutoTraderSettings) => void;
}

const LEVERAGE_MARKS = [1, 2, 3, 4, 5] as const;
const DEFAULT_FLOW = 40;

export function AutoSettingsForm({ saved, saving, disabled, onSave }: Props) {
	const [leverage, setLeverage] = useState(saved.leverage);
	const [stop, setStop] = useState(String(Number((saved.killPct * 100).toFixed(2))));
	const [minOrder, setMinOrder] = useState(String(saved.minOrderUsd));
	const [flow, setFlow] = useState(saved.flowPct ?? DEFAULT_FLOW);
	const next = { ...saved, leverage, killPct: Number(stop) / 100, minOrderUsd: Number(minOrder), flowPct: flow };
	const changed =
		next.leverage !== saved.leverage ||
		next.killPct !== saved.killPct ||
		next.minOrderUsd !== saved.minOrderUsd ||
		flow !== (saved.flowPct ?? DEFAULT_FLOW);
	const valid = next.killPct > 0 && next.killPct <= 0.5 && next.minOrderUsd >= 10;

	function reset() {
		setLeverage(saved.leverage);
		setStop(String(Number((saved.killPct * 100).toFixed(2))));
		setMinOrder(String(saved.minOrderUsd));
		setFlow(saved.flowPct ?? DEFAULT_FLOW);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between text-xs">
					<span className="text-fg-muted">Leverage</span>
					<span className="tabular-nums">{leverage}x</span>
				</div>
				<Slider
					value={leverage}
					onValueChange={(v) => setLeverage(Array.isArray(v) ? v[0] : v)}
					min={1}
					max={5}
					step={1}
					marks={LEVERAGE_MARKS}
					onMarkSelect={setLeverage}
					disabled={disabled}
				/>
			</div>
			<NumberInput
				inlineLabel="Daily loss stop"
				value={stop}
				onChange={(e) => setStop(e.target.value)}
				suffix="%"
				maxAllowedDecimals={2}
				disabled={disabled}
				invalid={!(next.killPct > 0 && next.killPct <= 0.5)}
			/>
			<NumberInput
				inlineLabel="Minimum order"
				value={minOrder}
				onChange={(e) => setMinOrder(e.target.value)}
				suffix="USD"
				maxAllowedDecimals={0}
				disabled={disabled}
				invalid={next.minOrderUsd < 10}
			/>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between text-xs">
					<span className="text-fg-muted">Signal blend</span>
					<span className="tabular-nums">
						Positions {100 - flow}%, 6h flow {flow}%
					</span>
				</div>
				<Slider
					value={flow}
					onValueChange={(v) => setFlow(Array.isArray(v) ? v[0] : v)}
					min={0}
					max={40}
					step={1}
					disabled={disabled}
					aria-label="Signal blend: six-hour flow weight"
				/>
				<div className="flex items-center justify-between text-2xs text-fg-muted">
					<span>Positions only</span>
					<button
						type="button"
						disabled={disabled || flow === DEFAULT_FLOW}
						onClick={() => setFlow(DEFAULT_FLOW)}
						className="transition-colors hover:text-fg disabled:opacity-50"
					>
						Reset to 60 / 40
					</button>
				</div>
			</div>
			{changed && (
				<div className="grid grid-cols-2 gap-2">
					<Button variant="secondary" intent="neutral" size="sm" onClick={reset} disabled={saving}>
						Reset
					</Button>
					<Button
						variant="secondary"
						intent="neutral"
						size="sm"
						onClick={() => onSave(next)}
						disabled={!valid || saving || disabled}
					>
						{saving ? "Confirm in wallet…" : "Save settings"}
					</Button>
				</div>
			)}
		</div>
	);
}
