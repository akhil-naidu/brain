import type { Metadata } from "next";
import { FeaturesShowcase } from "@/components/features/features-showcase";
import { HomeJsonLd } from "@/components/seo/json-ld";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: {
    absolute: SITE_NAME,
  },
  description: SITE_TAGLINE,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_TAGLINE,
    url: "/",
  },
  twitter: {
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return (
    <>
      <HomeJsonLd />
      <FeaturesShowcase />
    </>
  );
}
