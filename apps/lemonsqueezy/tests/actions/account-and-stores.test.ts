import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import storeList from "../../actions/store-list.ts";
import storeGet from "../../actions/store-get.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("user-get: GET /v1/users/me, no params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "users" }) }]);
  const result = await userGet.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.lemonsqueezy.com/v1/users/me");
  assertEquals(calls[0].method, "GET");
  assertEquals((result as { data: { id: string } }).data.id, "1");
});

Deno.test("store-list: filters via query, no filter[store_id] to speak of", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  await storeList.execute({ pageSize: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/stores");
  assertEquals(url.searchParams.get("page[size]"), "25");
});

Deno.test("store-get: GET /v1/stores/:id with optional include", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "5", type: "stores" }) }]);
  await storeGet.execute({ storeId: "5", include: "products" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/stores/5");
  assertEquals(url.searchParams.get("include"), "products");
});
