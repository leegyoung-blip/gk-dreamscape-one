import type { TokenPackage } from "./bank-types";

export const SHOPIFY_STORE_URL = "https://gurukidspro.com";

export const DREAM_TOKEN_1000_VARIANT_ID = "52635551629595";
export const DREAM_TOKEN_5000_VARIANT_ID = "52635551858971";

// Keep checkout gated until the Shopify payment + webhook crediting flow is ready.
export const DREAM_TOKEN_PURCHASES_ENABLED = false;

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    name: "Starter Token Pack",
    tokens: 1000,
    price: 5.9,
    description:
      "A simple Dream Token top-up for games, upgrades, customisation, and Milo’s World activities.",
    variantId: DREAM_TOKEN_1000_VARIANT_ID,
  },
  {
    name: "Mega Token Pack",
    tokens: 5000,
    price: 19.9,
    badge: "Best Value",
    description:
      "A larger Dream Token bundle for users who want more room to play, build, customise, and explore.",
    variantId: DREAM_TOKEN_5000_VARIANT_ID,
  },
];
