import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Features",
  alternates: { canonical: "/" },
  robots: { index: false, follow: true },
};

/** Old features URL — home is the showcase now. */
export default function FeaturesPage() {
  redirect("/");
}
