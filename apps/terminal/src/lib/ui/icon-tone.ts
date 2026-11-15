import { TOKEN_ICON_BASE_URL } from "@/config/app";

const SAMPLE = 32;
const DARK_LUMINANCE = 0.3;
const RING_SAMPLES = 32;
const cache = new Map<string, Promise<boolean>>();

function sameOriginUrl(url: string) {
	if (url.startsWith(TOKEN_ICON_BASE_URL)) return `/coins${url.slice(TOKEN_ICON_BASE_URL.length)}`;
	if (url.startsWith("/") || url.startsWith("data:")) return url;
	return null;
}

function luminance(r: number, g: number, b: number) {
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function isDarkGlyph(pixels: Uint8ClampedArray, size: number) {
	const alphaAt = (x: number, y: number) => pixels[(Math.round(y) * size + Math.round(x)) * 4 + 3];
	const center = (size - 1) / 2;
	const radius = size * 0.44;
	let solid = 0;
	for (let i = 0; i < RING_SAMPLES; i++) {
		const angle = (i / RING_SAMPLES) * Math.PI * 2;
		if (alphaAt(center + radius * Math.cos(angle), center + radius * Math.sin(angle)) > 128) solid++;
	}
	if (solid / RING_SAMPLES > 0.6) return false;
	let total = 0;
	let count = 0;
	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i + 3] < 128) continue;
		total += luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
		count++;
	}
	return count > 0 && total / count < DARK_LUMINANCE;
}

function measure(src: string) {
	return new Promise<boolean>((resolve) => {
		const img = new Image();
		img.decoding = "async";
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = SAMPLE;
				canvas.height = SAMPLE;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) return resolve(false);
				ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
				resolve(isDarkGlyph(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE));
			} catch {
				resolve(false);
			}
		};
		img.onerror = () => resolve(false);
		img.src = src;
	});
}

export function needsLightBacking(url: string | undefined): Promise<boolean> {
	if (!url || typeof document === "undefined") return Promise.resolve(false);
	const src = sameOriginUrl(url);
	if (!src) return Promise.resolve(false);
	let pending = cache.get(src);
	if (!pending) {
		pending = measure(src);
		cache.set(src, pending);
	}
	return pending;
}
