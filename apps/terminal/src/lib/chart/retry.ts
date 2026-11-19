const DELAYS_MS = [600, 1500, 3500];

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(job: () => Promise<T>, delays: readonly number[] = DELAYS_MS): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= delays.length; attempt++) {
		try {
			return await job();
		} catch (error) {
			lastError = error;
			if (attempt < delays.length) await wait(delays[attempt]);
		}
	}
	throw lastError;
}
