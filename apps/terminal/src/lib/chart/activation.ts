/** Refresh the visible chart on browser activation, without remounting it. */
export function onChartActivation(refresh: () => void): () => void {
	if (typeof window === "undefined" || typeof document === "undefined") return () => {};
	let lastActivation = -Infinity;
	const activate = () => {
		if (document.visibilityState === "hidden" || Date.now() - lastActivation < 1000) return;
		lastActivation = Date.now();
		refresh();
	};
	window.addEventListener("focus", activate);
	window.addEventListener("online", activate);
	window.addEventListener("pageshow", activate);
	document.addEventListener("visibilitychange", activate);
	return () => {
		window.removeEventListener("focus", activate);
		window.removeEventListener("online", activate);
		window.removeEventListener("pageshow", activate);
		document.removeEventListener("visibilitychange", activate);
	};
}
