import { assertEquals } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { mockCtxWithAccount, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-list: defaults to the connection's own account", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }], "biz_conn");
  await productList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/products");
  assertEquals(queryOf(calls[0].url).account_id, "biz_conn");
});

Deno.test("product-list: useMarketplace ignores the connection's account entirely", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }], "biz_conn");
  await productList.execute({ useMarketplace: true, query: "coaching" }, ctx);
  assertEquals(queryOf(calls[0].url).account_id, undefined);
  assertEquals(queryOf(calls[0].url).query, "coaching");
});

Deno.test("product-list: planTypes serializes bracketed, repeated per value", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }]);
  await productList.execute({ planTypes: ["renewal", "one_time"] }, ctx);
  assertEquals(queryOf(calls[0].url)["plan_types[]"], ["renewal", "one_time"]);
});
