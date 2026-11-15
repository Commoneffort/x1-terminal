import { useEffect, useState } from "react";
import { backingFor, type IconBacking } from "@/lib/ui/icon-tone";

export function useIconBacking(url: string | undefined): IconBacking {
	const [result, setResult] = useState<{ url: string | undefined; backing: IconBacking }>({
		url: undefined,
		backing: null,
	});
	useEffect(() => {
		let alive = true;
		void backingFor(url).then((backing) => {
			if (alive) setResult({ url, backing });
		});
		return () => {
			alive = false;
		};
	}, [url]);
	return result.url === url ? result.backing : null;
}
