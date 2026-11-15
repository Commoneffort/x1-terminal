import { getDemoAddress } from "@/lib/demo/demo-mode";
import { allowedMarkets } from "./targets";
import type { AutoTraderAction, AutoTraderSettings, AutoTraderStatus, PlanRow, SignalCoin } from "./types";

const CYCLE_MS = 5 * 60 * 1000;
const DEMO_AGENT = "0xdE30000000000000000000000000000000000001";
const STORAGE_KEY = "x1-terminal:auto-trader-demo";

interface DemoAccount {
	feeApproved: boolean;
	status: AutoTraderStatus;
	equity: number;
	coins: SignalCoin[];
}

type DemoStore = Record<string, DemoAccount>;

export function isDemoSession() {
	return getDemoAddress() !== null;
}

function read(): DemoStore {
	try {
		return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as DemoStore;
	} catch {
		return {};
	}
}

function write(store: DemoStore) {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch {}
}

function account(store: DemoStore, master: string): DemoAccount {
	const key = master.toLowerCase();
	store[key] ??= { feeApproved: false, status: { registered: false }, equity: 0, coins: [] };
	return store[key];
}

function update(master: string, change: (row: DemoAccount) => void) {
	const store = read();
	change(account(store, master));
	write(store);
}

function planRows(settings: AutoTraderSettings, equity: number, coins: SignalCoin[]): PlanRow[] {
	const markets = allowedMarkets(
		settings,
		coins.map((c) => c.coin),
	);
	const per = (equity * settings.leverage) / Math.max(1, markets.length);
	return markets.flatMap((market) => {
		const score = coins.find((c) => c.coin === market)?.score ?? 0;
		if (Math.abs(score) < 15) return [];
		const weight = score / 100;
		return [{ coin: market, weight, curNtl: 0, tgtNtl: weight * per, acts: ["OPEN"] }];
	});
}

export function demoStatus(master: string): AutoTraderStatus {
	const store = read();
	const row = account(store, master);
	const status = row.status;
	if (status.state === "active" && status.lastCycle && Date.now() - status.lastCycle >= CYCLE_MS) {
		status.lastCycle = Date.now();
		if (status.plan) {
			status.plan.ts = status.lastCycle;
			status.plan.rows = status.plan.rows?.map((r) => ({ ...r, curNtl: r.tgtNtl, acts: [] }));
		}
		write(store);
	}
	return { ...status, master: master as `0x${string}` };
}

export function demoFeeApproved(master: string) {
	return account(read(), master).feeApproved;
}

export function demoApproveFee(master: string) {
	update(master, (row) => {
		row.feeApproved = true;
	});
}

export function demoSetContext(master: string, equity: number, coins: SignalCoin[]) {
	update(master, (row) => {
		row.equity = equity;
		row.coins = coins;
	});
}

export function demoAction(master: string, action: AutoTraderAction, settings?: AutoTraderSettings) {
	update(master, (row) => {
		const status = row.status;
		if (action === "register") {
			row.status = {
				registered: true,
				hasKey: true,
				agent: DEMO_AGENT,
				state: "paused",
				settings,
				validUntil: Date.now() + 90 * 86_400_000,
				created: Date.now(),
			};
			return;
		}
		if (action === "remove") {
			row.status = { registered: false };
			return;
		}
		if (action === "settings" && settings) status.settings = settings;
		if (action === "pause") status.state = "paused";
		if (action === "resume" && status.settings) {
			status.state = "active";
			status.lastCycle = Date.now();
			status.plan = {
				ts: Date.now(),
				state: "active",
				live: true,
				equity: row.equity,
				dayStart: row.equity,
				dayPnl: 0,
				killed: false,
				rows: planRows(status.settings, row.equity, row.coins),
				fills: [],
			};
		}
	});
}
