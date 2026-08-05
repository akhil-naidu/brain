import Image from "next/image";

import { cn } from "@/lib/utils";

/** Cache-bust when the transparent asset is replaced. */
export const BRAIN_MARK_SRC = "/brain-mark.png?v=8";

export function BrainMark({ className }: { readonly className?: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("size-5 object-contain", className)}
      height={64}
      // Preserve PNG alpha — the optimizer composites transparent pixels onto white.
      unoptimized
      src={BRAIN_MARK_SRC}
      width={64}
    />
  );
}
