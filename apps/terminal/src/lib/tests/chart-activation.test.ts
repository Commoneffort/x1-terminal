// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { onChartActivation } from "@/lib/chart/activation";

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});
it("ignores hidden events, combines focus and visibility, and removes every listener", () => {
	vi.useFakeTimers();
	const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
	const refresh = vi.fn();
	const stop = onChartActivation(refresh);
	window.dispatchEvent(new Event("focus"));
	document.dispatchEvent(new Event("visibilitychange"));
	expect(refresh).not.toHaveBeenCalled();
	visibility.mockReturnValue("visible");
	document.dispatchEvent(new Event("visibilitychange"));
	window.dispatchEvent(new Event("focus"));
	expect(refresh).toHaveBeenCalledTimes(1);
	vi.advanceTimersByTime(1000);
	window.dispatchEvent(new Event("pageshow"));
	expect(refresh).toHaveBeenCalledTimes(2);
	vi.advanceTimersByTime(1000);
	window.dispatchEvent(new Event("online"));
	expect(refresh).toHaveBeenCalledTimes(3);
	stop();
	vi.advanceTimersByTime(1000);
	for (const name of ["focus", "online", "pageshow"]) window.dispatchEvent(new Event(name));
	document.dispatchEvent(new Event("visibilitychange"));
	expect(refresh).toHaveBeenCalledTimes(3);
});
