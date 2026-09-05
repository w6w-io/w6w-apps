import { assertEquals } from "@std/assert";
import getShopInfo from "../../actions/get-shop-info.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-shop-info: GETs with no body, and unwraps `shop`", async () => {
  const { ctx, calls } = mockCtx([{ body: { shop: { id: "111", plan: "basic" } } }]);
  const out = await getShopInfo.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/shops/info");
  assertEquals(calls[0].body, null, "a GET must not send the doc's malformed requestBody");
  assertEquals(out, { shop: { id: "111", plan: "basic" } });
});

Deno.test("get-shop-info: falls back to the raw body when there's no `shop` key", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: true } }]);
  const out = await getShopInfo.execute({}, ctx);
  assertEquals(out, { shop: { unexpected: true } });
});
