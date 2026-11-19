import { expect, it } from "vitest";
import { autoTraderErrorMessage } from "@/lib/auto-trader/error-message";

it("maps wallet errors to plain messages", () => {
	const rejected = new Error("Failed to sign typed data with viem wallet", {
		cause: Object.assign(new Error("User rejected the request."), { code: 4001 }),
	});
	expect(autoTraderErrorMessage(rejected)).toBe("Signature cancelled.");
	expect(autoTraderErrorMessage(new Error("Failed to sign typed data with viem wallet"))).toBe(
		"Your wallet could not sign. Unlock it and try again.",
	);
	expect(autoTraderErrorMessage(new Error("Approve the 0.05% builder fee first."))).toBe(
		"Approve the 0.05% builder fee first.",
	);
	expect(autoTraderErrorMessage(undefined)).toBe("Auto Trader request failed. Try again.");
});
