import { assert, assertEquals } from "@std/assert";
import updateShop from "../../actions/update-shop.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-shop: PUTs only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { domain: "example.myshopify.com" } }]);
  const out = await updateShop.execute({ domain: "example.myshopify.com", plan: "basic" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/shops");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { domain: "example.myshopify.com", plan: "basic" });
  assert(!("email" in sent), "unset fields must not be sent");
  assertEquals(out, { result: { domain: "example.myshopify.com" } });
});
