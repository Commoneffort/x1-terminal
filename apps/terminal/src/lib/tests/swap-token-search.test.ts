import { expect, it } from "vitest";
import { searchSwapTokens } from "@/lib/trade/swap-token-search";

const tokens = [
	{ name: "ADHD", displayName: "ADHD", fullName: "Attention Deficit Hyperliquid Disorder" },
	{ name: "KHYPE", displayName: "KHYPE", fullName: "Kinetiq Staked HYPE" },
	{ name: "HYPE", displayName: "HYPE", fullName: "Hyperliquid" },
	{ name: "UETH", displayName: "ETH", fullName: "Unit Ethereum" },
	{ name: "AAPL", displayName: "AAPL", fullName: null },
];
const balances: Record<string, number> = { UETH: 0.5 };
const balance = (name: string) => balances[name] ?? 0;

it("ranks exact, prefix, contains, then full name matches", () => {
	expect(searchSwapTokens(tokens, "hype", balance).map((t) => t.name)).toEqual(["HYPE", "KHYPE", "ADHD"]);
});

it("lists held tokens first when the query is empty", () => {
	expect(searchSwapTokens(tokens, "", balance)[0].name).toBe("UETH");
});

it("matches the display name and returns nothing for unknown text", () => {
	expect(searchSwapTokens(tokens, "eth", balance).map((t) => t.name)).toEqual(["UETH"]);
	expect(searchSwapTokens(tokens, "zzz", balance)).toEqual([]);
});
