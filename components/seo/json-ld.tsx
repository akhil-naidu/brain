import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_VERSION } from "@/lib/seo/site";

export function HomeJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    softwareVersion: SITE_VERSION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return <script type="application/ld+json">{JSON.stringify(data)}</script>;
}
