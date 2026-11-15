interface SearchableToken {
	name: string;
	displayName: string;
	fullName?: string | null;
}

function rank(token: SearchableToken, query: string) {
	if (!query) return 1;
	const name = token.displayName.toLowerCase();
	if (name === query || token.name.toLowerCase() === query) return 0;
	if (name.startsWith(query)) return 1;
	if (name.includes(query) || token.name.toLowerCase().includes(query)) return 2;
	if (token.fullName?.toLowerCase().includes(query)) return 3;
	return -1;
}

export function searchSwapTokens<T extends SearchableToken>(
	tokens: readonly T[],
	query: string,
	getBalance: (name: string) => number,
): T[] {
	const q = query.trim().toLowerCase();
	return tokens
		.map((token) => ({ token, rank: rank(token, q), balance: getBalance(token.name) }))
		.filter((row) => row.rank >= 0)
		.sort((a, b) => {
			if (a.rank !== b.rank) return a.rank - b.rank;
			const held = Number(b.balance > 0) - Number(a.balance > 0);
			if (held) return held;
			if (a.balance !== b.balance) return b.balance - a.balance;
			return a.token.displayName.localeCompare(b.token.displayName);
		})
		.map((row) => row.token);
}
