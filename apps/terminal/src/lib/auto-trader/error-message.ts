const MAX_DEPTH = 6;
const REJECTED = /user rejected|user denied|rejected the request|request rejected|cancell?ed/i;
const SIGN_FAILED = /failed to sign/i;

function chain(error: unknown) {
	const messages: string[] = [];
	const codes: unknown[] = [];
	let current: unknown = error;
	for (let depth = 0; current && depth < MAX_DEPTH; depth++) {
		if (typeof current === "string") {
			messages.push(current);
			break;
		}
		if (typeof current !== "object") break;
		const record = current as Record<string, unknown>;
		for (const key of ["shortMessage", "details", "message"]) {
			if (typeof record[key] === "string") messages.push(record[key] as string);
		}
		codes.push(record.code);
		current = record.cause;
	}
	return { messages, codes };
}

export function autoTraderErrorMessage(error: unknown) {
	const { messages, codes } = chain(error);
	if (codes.includes(4001) || messages.some((m) => REJECTED.test(m))) return "Signature cancelled.";
	if (messages.some((m) => SIGN_FAILED.test(m))) return "Your wallet could not sign. Unlock it and try again.";
	return messages[0] ?? "Auto Trader request failed. Try again.";
}
