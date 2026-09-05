import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { EbayClient, isOAuthError } from "../../lib/client.ts";

Deno.test("client: builds the URL against api.ebay.com and never sets Authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: { itemId: "v1%7C1%7C0" } }]);
  // The caller (e.g. item-get) is responsible for encoding path segments —
  // the client passes `path` through verbatim.
  await new EbayClient(ctx).request("/buy/browse/v1/item/v1%7C1%7C0");
  assertEquals(calls[0].url, "https://api.ebay.com/buy/browse/v1/item/v1%7C1%7C0");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: drops undefined/null/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EbayClient(ctx).request("/buy/browse/v1/item_summary/search", {
    query: { q: "shirt", category_ids: undefined, filter: null, sort: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("q"), "shirt");
  assertEquals(url.searchParams.has("category_ids"), false);
  assertEquals(url.searchParams.has("filter"), false);
  assertEquals(url.searchParams.has("sort"), false);
});

Deno.test("client: surfaces eBay's error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errors: [{
        errorId: 1001,
        domain: "OAuth",
        category: "REQUEST",
        message: "Invalid access token",
        longMessage:
          "Invalid access token. Check the value of the Authorization HTTP request header.",
      }],
    },
  }]);
  await assertRejects(
    () => new EbayClient(ctx).request("/buy/browse/v1/item_summary/search"),
    Error,
    "Invalid access token. Check the value",
  );
});

Deno.test("client: returns undefined for an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new EbayClient(ctx).request("/buy/browse/v1/item_summary/search"), undefined);
});

Deno.test("isOAuthError: true only when the first error's domain is OAuth", () => {
  assertEquals(isOAuthError({ errors: [{ domain: "OAuth" }] }), true);
  assertEquals(isOAuthError({ errors: [{ domain: "API_BROWSE" }] }), false);
  assertEquals(isOAuthError({ errors: [] }), false);
  assertEquals(isOAuthError(undefined), false);
});
