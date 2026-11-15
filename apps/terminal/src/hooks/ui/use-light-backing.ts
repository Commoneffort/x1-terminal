import { useEffect, useState } from "react";
import { needsLightBacking } from "@/lib/ui/icon-tone";

export function useLightBacking(url: string | undefined) {
	const [result, setResult] = useState<{ url: string | undefined; light: boolean }>({ url: undefined, light: false });
	useEffect(() => {
		let alive = true;
		void needsLightBacking(url).then((light) => {
			if (alive) setResult({ url, light });
		});
		return () => {
			alive = false;
		};
	}, [url]);
	return result.url === url && result.light;
}
