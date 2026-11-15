import type { AutoTraderPhase } from "./phase";
import type { AutoTraderStatus } from "./types";

const STALE_MS = 10 * 60_000;

export function autoStatusText(
	phase: AutoTraderPhase,
	status: AutoTraderStatus | undefined,
	next: string | null,
	now: number,
) {
	const plan = status?.plan;
	if (phase === "setup") return { title: "Not set up", subtitle: "Finish setup in the Auto tab" };
	if (phase === "paused") return { title: "Paused", subtitle: "Positions stay open" };
	if (phase === "closing") return { title: "Closing positions", subtitle: "Positions close on the next cycle" };
	if (phase === "stopped") return { title: "Loss stop reached", subtitle: "Only reduces exposure until the UTC reset" };
	if (phase === "waiting") return { title: "Starting", subtitle: "Waiting for the first cycle" };
	const last = status?.lastCycle ?? plan?.ts ?? 0;
	if (now - last > STALE_MS)
		return { title: "Waiting for executor", subtitle: "The last cycle is over 10 minutes old" };
	const title = plan?.live === true && plan.dryRun !== true ? "Trading" : "Dry run";
	return { title, subtitle: next ? `Next cycle in ${next.replace("~", "")}` : "Cycle schedule unavailable" };
}
