import { redirect } from "next/navigation";

/** Old features URL — home is the showcase now. */
export default function FeaturesPage() {
  redirect("/");
}
