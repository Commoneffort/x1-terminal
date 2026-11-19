import { create } from "zustand";

export type TradeMode = "manual" | "auto";

export const useTradeModeStore = create<{ mode: TradeMode }>()(() => ({ mode: "manual" }));

export function setTradeMode(mode: TradeMode) {
	useTradeModeStore.setState({ mode });
}
