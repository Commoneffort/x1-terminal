import { createContext, type ReactNode, useContext } from "react";
export const TerminalBrandContext = createContext<ReactNode>(null);
export function useTerminalBrand() {
	return useContext(TerminalBrandContext);
}
