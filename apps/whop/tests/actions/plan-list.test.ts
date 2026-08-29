import { assertEquals } from "@std/assert";
import planList from "../../actions/plan-list.ts";
import { mockCtxWithAccount, pageEnvelope, queryOf } from "../_helpers.ts";

Deno.test("plan-list: defaults to the connection's account when no productIds are given", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }], "biz_conn");
  await planList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).account_id, "biz_conn");
});

Deno.test("plan-list: productIds makes the read public — no account_id is sent", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: pageEnvelope([]) }], "biz_conn");
  await planList.execute({ productIds: ["prod_1", "prod_2"] }, ctx);
  assertEquals(queryOf(calls[0].url).account_id, undefined);
  assertEquals(queryOf(calls[0].url)["product_ids[]"], ["prod_1", "prod_2"]);
});
