import { SHOPIFY_STORE_URL } from "./bank-config";

type BuildShopifyTokenUrlArgs = {
  variantId: string;
  tokens: number;
  userId: string;
  userEmail: string;
};

export function buildShopifyTokenUrl({
  variantId,
  tokens,
  userId,
  userEmail,
}: BuildShopifyTokenUrlArgs) {
  if (!variantId || !userId) return "";

  const params = new URLSearchParams();

  // Preserve the existing Dreamscape checkout metadata so the Shopify webhook
  // can identify which Dreamscape account and DT pack should be credited.
  params.set("attributes[dreamscape_user_id]", userId);
  params.set("attributes[dreamscape_token_pack]", String(tokens));
  params.set("attributes[source]", "dreamscape-one");
  params.set("ref", "dreamscape-one");

  if (userEmail) {
    params.set("checkout[email]", userEmail);
  }

  return `${SHOPIFY_STORE_URL}/cart/${variantId}:1?${params.toString()}`;
}
