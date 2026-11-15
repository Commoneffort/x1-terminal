import { expect, it } from "vitest";
import { isDarkGlyph } from "@/lib/ui/icon-tone";

const SIZE = 32;

function draw(paint: (x: number, y: number) => [number, number, number, number] | null) {
	const pixels = new Uint8ClampedArray(SIZE * SIZE * 4);
	for (let y = 0; y < SIZE; y++)
		for (let x = 0; x < SIZE; x++) {
			const color = paint(x, y);
			if (color) pixels.set(color, (y * SIZE + x) * 4);
		}
	return pixels;
}

const inside = (x: number, y: number, r: number) => (x - 15.5) ** 2 + (y - 15.5) ** 2 <= r * r;

it("flags a dark glyph on a transparent background", () => {
	const glyph = draw((x, y) => (x > 10 && x < 22 && y > 8 && y < 24 ? [10, 10, 10, 255] : null));
	expect(isDarkGlyph(glyph, SIZE)).toBe(true);
});

it("leaves full-circle logos alone, even when they are dark", () => {
	const disc = draw((x, y) => (inside(x, y, 16) ? [5, 5, 5, 255] : null));
	expect(isDarkGlyph(disc, SIZE)).toBe(false);
});

it("leaves light glyphs alone", () => {
	const glyph = draw((x, y) => (x > 10 && x < 22 && y > 8 && y < 24 ? [240, 240, 240, 255] : null));
	expect(isDarkGlyph(glyph, SIZE)).toBe(false);
});
