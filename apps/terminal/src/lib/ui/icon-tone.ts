import { TOKEN_ICON_BASE_URL } from "@/config/app";

const SAMPLE = 32;
const DARK_LUMINANCE = 0.3;
const RING_SAMPLES = 32;
const cache = new Map<string, Promise<IconBacking>>();

function sameOriginUrl(url: string) {
	if (url.startsWith(TOKEN_ICON_BASE_URL)) return `/coins${url.slice(TOKEN_ICON_BASE_URL.length)}`;
	if (url.startsWith("/") || url.startsWith("data:")) return url;
	return null;
}

function luminance(r: number, g: number, b: number) {
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export type IconBacking = "light" | "dark" | null;

export function iconBacking(pixels: Uint8ClampedArray, size: number): IconBacking {
	const alphaAt = (x: number, y: number) => pixels[(Math.round(y) * size + Math.round(x)) * 4 + 3];
	const center = (size - 1) / 2;
	const radius = size * 0.44;
	let solid = 0;
	for (let i = 0; i < RING_SAMPLES; i++) {
		const angle = (i / RING_SAMPLES) * Math.PI * 2;
		if (alphaAt(center + radius * Math.cos(angle), center + radius * Math.sin(angle)) > 128) solid++;
	}
	if (solid / RING_SAMPLES > 0.6) return null;
	let total = 0;
	let count = 0;
	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i + 3] < 128) continue;
		total += luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
		count++;
	}
	if (count === 0) return null;
	return total / count < DARK_LUMINANCE ? "light" : "dark";
}

function measure(src: string) {
	return new Promise<IconBacking>((resolve) => {
		const img = new Image();
		img.decoding = "async";
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = SAMPLE;
				canvas.height = SAMPLE;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) return resolve(null);
				ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
				resolve(iconBacking(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE));
			} catch {
				resolve(null);
			}
		};
		img.onerror = () => resolve(null);
		img.src = src;
	});
}

export function backingFor(url: string | undefined): Promise<IconBacking> {
	if (!url || typeof document === "undefined") return Promise.resolve(null);
	const src = sameOriginUrl(url);
	if (!src) return Promise.resolve(null);
	let pending = cache.get(src);
	if (!pending) {
		pending = measure(src);
		cache.set(src, pending);
	}
	return pending;
}
