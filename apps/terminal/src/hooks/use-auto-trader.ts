import { useState } from "react";
import { toast } from "sonner";
import { zeroAddress } from "viem";
import { useConnection } from "wagmi";
import { AUTO_TRADER_BUILDER, AUTO_TRADER_MIN_EQUITY } from "@/config/auto-trader";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { demoSetContext, isDemoSession } from "@/lib/auto-trader/demo-sim";
import { autoTraderErrorMessage } from "@/lib/auto-trader/error-message";
import { useAutoTraderMutation, useAutoTraderSignal, useAutoTraderStatus } from "@/lib/auto-trader/hooks";
import { autoTraderPhase } from "@/lib/auto-trader/phase";
import { accountEquity, allowedMarkets, validateSettings } from "@/lib/auto-trader/targets";
import type { AutoTraderSettings } from "@/lib/auto-trader/types";
import { useHyperliquid, useInfo } from "@/lib/hyperliquid";

type Op = "start" | "pause" | "settings";

export function useAutoTrader() {
	const { address: owner } = useConnection();
	const { address, isConnected } = useTradingAccount();
	const { env } = useHyperliquid();
	const master = address ?? zeroAddress;
	const available = env === "Mainnet" && isConnected && !!address;
	const status = useAutoTraderStatus(master, available);
	const signal = useAutoTraderSignal(available);
	const control = useAutoTraderMutation(master);
	const lazy = { enabled: available && isDemoSession() };
	const agents = useInfo("extraAgents", { user: owner ?? zeroAddress }, lazy);
	const fee = useInfo("maxBuilderFee", { user: owner ?? zeroAddress, builder: AUTO_TRADER_BUILDER }, lazy);
	const main = useInfo("clearinghouseState", { user: master }, lazy);
	const xyz = useInfo("clearinghouseState", { user: master, dex: "xyz" }, lazy);
	const spot = useInfo("spotClearinghouseState", { user: master }, lazy);
	const mode = useInfo("userAbstraction", { user: master }, lazy);
	const [pending, setPending] = useState<Op | null>(null);

	const universe = signal.isError ? [] : [...new Set(signal.data?.coins.map((c) => c.coin) ?? [])];
	const settings = status.data?.settings;
	const phase = autoTraderPhase(status.data);
	const markets = settings ? allowedMarkets(settings, universe) : [];

	async function verifyReady() {
		const current = await status.refetch();
		if (current.isError || !current.data?.registered || !current.data.hasKey)
			throw new Error("Auto Trader is not registered for this account.");
		const [a, f, m, x, s, ab] = await Promise.all([
			agents.refetch(),
			fee.refetch(),
			main.refetch(),
			xyz.refetch(),
			spot.refetch(),
			mode.refetch(),
		]);
		if ([a, f, m, x, s, ab].some((q) => q.isError)) throw new Error("Could not check the account. Try again.");
		const agent = current.data.agent?.toLowerCase();
		if (!a.data?.some((row) => row.address.toLowerCase() === agent && row.validUntil > Date.now()))
			throw new Error("The Auto Trader API wallet expired. Renew it on the API page.");
		if (f.data === undefined || f.data < 50) throw new Error("Approve the 0.05% builder fee first.");
		const equity = accountEquity(ab.data, m.data, x.data, s.data);
		if (equity === null || equity < AUTO_TRADER_MIN_EQUITY)
			throw new Error(`Auto Trader needs at least $${AUTO_TRADER_MIN_EQUITY} in account equity.`);
		const saved = current.data.settings ?? settings;
		if (saved) validateSettings(saved, universe);
	}

	async function run(op: Op, job: () => Promise<unknown>, done: string) {
		if (pending) return;
		setPending(op);
		try {
			await job();
			await status.refetch();
			toast.success(done);
		} catch (e) {
			toast.error(autoTraderErrorMessage(e));
		} finally {
			setPending(null);
		}
	}

	function prepareDemo() {
		const equity =
			accountEquity(mode.data, main.data, xyz.data, spot.data) ?? Number(main.data?.marginSummary.accountValue ?? 0);
		demoSetContext(master, equity, signal.data?.coins ?? []);
	}

	function start() {
		return run(
			"start",
			async () => {
				if (isDemoSession()) prepareDemo();
				else await verifyReady();
				await control.mutateAsync({ action: "resume", body: {} });
			},
			"Auto Trader started.",
		);
	}

	function pause() {
		return run("pause", () => control.mutateAsync({ action: "pause", body: {} }), "Auto Trader paused.");
	}

	function saveSettings(next: AutoTraderSettings) {
		return run(
			"settings",
			async () => {
				validateSettings(next, universe);
				await control.mutateAsync({ action: "settings", body: { ...next, exclude: next.exclude ?? [] } });
			},
			"Auto Trader settings saved.",
		);
	}

	return {
		demo: isDemoSession(),
		available,
		env,
		phase,
		status: status.data,
		loading: available && status.isLoading,
		statusError: status.isError,
		settings,
		universe,
		markets,
		pending,
		start,
		pause,
		saveSettings,
	};
}
