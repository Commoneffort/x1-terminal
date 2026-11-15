// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { NumberInput } from "@/components/ui/number-input";

it("keeps the same input element when an error appears", async () => {
	function Harness() {
		const [value, setValue] = useState("");
		return createElement(NumberInput, {
			"aria-label": "SL",
			value,
			onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
			error: value ? "SL must be above mark price" : undefined,
		});
	}
	const node = document.createElement("div");
	document.body.append(node);
	const root = createRoot(node);
	await act(async () => root.render(createElement(Harness)));
	const before = node.querySelector("input");
	await act(async () => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
		setter?.call(before, "6");
		before?.dispatchEvent(new Event("input", { bubbles: true }));
	});
	expect(node.textContent).toContain("SL must be above mark price");
	expect(node.querySelector("input")).toBe(before);
	await act(async () => root.unmount());
});
