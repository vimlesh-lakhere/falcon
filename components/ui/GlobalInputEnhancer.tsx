"use client";

import { useEffect } from "react";

/**
 * GlobalInputEnhancer:
 * Automatically selects the entire value of any numeric / price / quantity input
 * when focused or clicked. This eliminates the frustrating user experience of having
 * to manually backspace or delete prefilled '0' before entering a new price or quantity.
 */
export function GlobalInputEnhancer() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement &&
        (target.type === "number" ||
          target.inputMode === "numeric" ||
          target.inputMode === "decimal" ||
          target.classList.contains("numeric-input") ||
          target.name?.includes("price") ||
          target.name?.includes("stock") ||
          target.name?.includes("quantity") ||
          target.name?.includes("discount"))
      ) {
        // Use setTimeout to ensure mobile keyboard and browser focus selection settle properly
        setTimeout(() => {
          try {
            target.select();
          } catch {}
        }, 15);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement &&
        (target.type === "number" ||
          target.inputMode === "numeric" ||
          target.inputMode === "decimal")
      ) {
        // If current value is 0 or 0.00 or numeric, select all on single tap
        if (
          target.value === "0" ||
          target.value === "0.0" ||
          target.value === "0.00" ||
          target.value === "0.000"
        ) {
          setTimeout(() => {
            try {
              target.select();
            } catch {}
          }, 15);
        }
      }
    };

    document.addEventListener("focusin", handleFocus, true);
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("focusin", handleFocus, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
