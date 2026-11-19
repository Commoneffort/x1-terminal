import { expect, it, vi } from "vitest";
import { withRetry } from "@/lib/chart/retry";

it("retries a failing request and returns the first success", async () => {
	const job = vi
		.fn()
		.mockRejectedValueOnce(new Error("429"))
		.mockRejectedValueOnce(new Error("429"))
		.mockResolvedValue("bars");
	await expect(withRetry(job, [1, 1, 1])).resolves.toBe("bars");
	expect(job).toHaveBeenCalledTimes(3);
});

it("throws the last error after all attempts fail", async () => {
	const job = vi.fn().mockRejectedValue(new Error("down"));
	await expect(withRetry(job, [1, 1])).rejects.toThrow("down");
	expect(job).toHaveBeenCalledTimes(3);
});
