import { describe, expect, it } from "vitest";
import type { Connector } from "wagmi";
import {
	getWalletConnectorGroups,
	isWalletConnectConnector,
	sortWalletConnectors,
	subscribeWalletConnectUri,
} from "../wallet-utils";

function connector(input: Partial<Connector> & Pick<Connector, "id" | "name" | "type">): Connector {
	return {
		uid: input.uid ?? input.id,
		icon: input.icon,
		rdns: input.rdns,
		setup: input.setup,
		connect: input.connect,
		disconnect: input.disconnect,
		getAccounts: input.getAccounts,
		getChainId: input.getChainId,
		getProvider: input.getProvider,
		isAuthorized: input.isAuthorized,
		switchChain: input.switchChain,
		onAccountsChanged: input.onAccountsChanged,
		onChainChanged: input.onChainChanged,
		onConnect: input.onConnect,
		onDisconnect: input.onDisconnect,
		onMessage: input.onMessage,
		...input,
	} as Connector;
}

describe("wallet utilities", () => {
	it("sorts popular connectors by recent wallet first and configured priority second", () => {
		const rabby = connector({ id: "rabby", name: "Rabby", type: "injected" });
		const phantom = connector({ id: "phantom", name: "Phantom", type: "injected" });
		const x1 = connector({ id: "x1", name: "X1", type: "x1" });

		expect(sortWalletConnectors([x1, phantom, rabby], ["x1"]).map((item) => item.id)).toEqual([
			"x1",
			"rabby",
			"phantom",
		]);
	});

	it("splits mock connectors away from regular popular and other wallets", () => {
		const groups = getWalletConnectorGroups(
			[
				connector({ id: "mock", name: "Mock Wallet", type: "mock" }),
				connector({ id: "rabby", name: "Rabby", type: "injected" }),
				connector({ id: "injected", name: "Injected", type: "injected" }),
			],
			[],
		);

		expect(groups.mockConnectors.map((item) => item.id)).toEqual(["mock"]);
		expect(groups.popular.map((item) => item.id)).toEqual(["rabby"]);
		expect(groups.other.map((item) => item.id)).toEqual(["injected"]);
	});

	it("subscribes to WalletConnect display_uri messages only for WalletConnect connectors", () => {
		let handler: ((message: { type?: string; data?: unknown }) => void) | null = null;
		const walletConnect = connector({
			id: "walletConnect",
			name: "WalletConnect",
			type: "walletConnect",
			emitter: {
				on: (_eventName: "message", nextHandler: (message: { type?: string; data?: unknown }) => void) => {
					handler = nextHandler;
				},
				off: (_eventName: "message", nextHandler: (message: { type?: string; data?: unknown }) => void) => {
					if (handler === nextHandler) handler = null;
				},
			},
		} as Partial<Connector> & Pick<Connector, "id" | "name" | "type">);
		const uris: string[] = [];
		function emit(message: { type?: string; data?: unknown }) {
			if (handler) handler(message);
		}

		expect(isWalletConnectConnector(walletConnect)).toBe(true);
		const unsubscribe = subscribeWalletConnectUri(walletConnect, (uri) => uris.push(uri));

		emit({ type: "display_uri", data: "wc:abc@2?relay-protocol=irn" });
		emit({ type: "other", data: "wc:ignored" });
		emit({ type: "display_uri", data: 123 });

		expect(uris).toEqual(["wc:abc@2?relay-protocol=irn"]);
		unsubscribe();
		expect(handler).toBeNull();
	});
});
