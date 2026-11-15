import { useEffect, useRef, useState } from "react";
import { type Address, type Hex, zeroAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useConnection } from "wagmi";
import {
	AUTO_TRADER_AGENT_NAME,
	AUTO_TRADER_BUILDER,
	AUTO_TRADER_DEFAULTS,
	AUTO_TRADER_MIN_EQUITY,
} from "@/config/auto-trader";
import { BUILDER_CONFIGURED, DEFAULT_BUILDER_CONFIG } from "@/config/hyperliquid";
import { useTradingAccount } from "@/hooks/use-trading-account";
import { sealAgentKey } from "@/lib/auto-trader/api";
import { useAutoTraderMutation, useAutoTraderStatus } from "@/lib/auto-trader/hooks";
import { accountEquity } from "@/lib/auto-trader/targets";
import { useExchange, useHyperliquid, useInfo } from "@/lib/hyperliquid";

const KEY_DAYS = 90;
const DAY_MS = 86_400_000;

export type SetupStep = "fee" | "funds" | "key";

interface PendingKey {
	key: Hex;
	address: Address;
	validUntil: number;
}

export function useAutoTraderSetup() {
	const { address: owner } = useConnection();
	const { address } = useTradingAccount();
	const { env } = useHyperliquid();
	const master = address ?? zeroAddress;
	const user = owner ?? zeroAddress;
	const opts = { refetchInterval: 30_000, refetchOnWindowFocus: true };
	const fee = useInfo("maxBuilderFee", { user, builder: AUTO_TRADER_BUILDER }, opts);
	const agents = useInfo("extraAgents", { user }, opts);
	const main = useInfo("clearinghouseState", { user: master }, opts);
	const xyz = useInfo("clearinghouseState", { user: master, dex: "xyz" }, opts);
	const spot = useInfo("spotClearinghouseState", { user: master }, opts);
	const mode = useInfo("userAbstraction", { user: master }, opts);
	const status = useAutoTraderStatus(master, !!address);
	const control = useAutoTraderMutation(master);
	const approveFee = useExchange("approveBuilderFee");
	const approveAgent = useExchange("approveAgent");
	const pending = useRef<PendingKey | null>(null);
	const [busy, setBusy] = useState<SetupStep | null>(null);
	const [progress, setProgress] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(
		() => () => {
			if (pending.current) pending.current.key = "0x";
			pending.current = null;
		},
		[],
	);

	const configured = BUILDER_CONFIGURED && DEFAULT_BUILDER_CONFIG?.b.toLowerCase() === AUTO_TRADER_BUILDER;
	const feeDone = fee.data !== undefined && fee.data >= 50;
	const balancesError = main.isError || xyz.isError || spot.isError || mode.isError;
	const equity = balancesError ? null : accountEquity(mode.data, main.data, xyz.data, spot.data);
	const fundsDone = equity !== null && equity >= AUTO_TRADER_MIN_EQUITY;
	const portfolioMargin = mode.data === "portfolioMargin";
	let current: SetupStep = "key";
	if (!feeDone) current = "fee";
	else if (!fundsDone) current = "funds";

	function guard() {
		if (env !== "Mainnet") throw new Error("Auto Trader runs on Mainnet only.");
		if (!owner || !address) throw new Error("Connect your wallet first.");
		if (!configured) throw new Error("This terminal's builder does not match the Auto Trader service.");
	}

	async function run(step: SetupStep, job: () => Promise<void>) {
		if (busy) return;
		setBusy(step);
		setError(null);
		try {
			guard();
			await job();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Setup failed. Try again.");
		} finally {
			setBusy(null);
			setProgress("");
		}
	}

	function approve() {
		return run("fee", async () => {
			setProgress("Confirm the fee approval in your wallet.");
			await approveFee.mutateAsync({ builder: AUTO_TRADER_BUILDER, maxFeeRate: "0.05%" });
			const checked = await fee.refetch();
			if (checked.isError || checked.data === undefined || checked.data < 50)
				throw new Error("Fee approval sent. It is not confirmed yet. Try again in a moment.");
		});
	}

	async function ensureAgent(): Promise<PendingKey> {
		if (!pending.current) {
			const key = generatePrivateKey();
			pending.current = { key, address: privateKeyToAccount(key).address, validUntil: Date.now() + KEY_DAYS * DAY_MS };
		}
		const fresh = pending.current;
		const isApproved = (rows: { address: string; validUntil: number }[] | undefined) =>
			!!rows?.some((row) => row.address.toLowerCase() === fresh.address.toLowerCase() && row.validUntil > Date.now());
		const existing = await agents.refetch();
		if (existing.isError) throw new Error("Could not check your API wallets. Try again.");
		if (!isApproved(existing.data)) {
			setProgress("Signature 1 of 2: approve the trading key.");
			await approveAgent.mutateAsync({
				agentAddress: fresh.address,
				agentName: `${AUTO_TRADER_AGENT_NAME} valid_until ${fresh.validUntil}`,
			});
			const verified = await agents.refetch();
			if (verified.isError || !isApproved(verified.data))
				throw new Error("Key approval sent. It is not confirmed yet. Try again in a moment.");
		}
		return fresh;
	}

	function createKey() {
		return run("key", async () => {
			const fresh = await ensureAgent();
			setProgress("Signature 2 of 2: register the key with Auto Trader.");
			const settings = {
				...(status.data?.settings ?? AUTO_TRADER_DEFAULTS),
				exclude: status.data?.settings?.exclude ?? [],
			};
			await control.mutateAsync({
				action: "register",
				body: (serverKey: string) => ({
					master,
					agent: fresh.address,
					sealedKey: sealAgentKey(fresh.key, serverKey),
					settings,
				}),
			});
			fresh.key = "0x";
			pending.current = null;
			await status.refetch();
		});
	}

	return {
		configured,
		current,
		feeDone,
		fundsDone,
		equity,
		portfolioMargin,
		busy,
		progress,
		error,
		approve,
		createKey,
	};
}
