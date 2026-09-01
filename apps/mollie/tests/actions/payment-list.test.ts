import { assertEquals } from "@std/assert";
import paymentList from "../../actions/payment-list.ts";
import { list, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payment-list: unwraps _embedded.payments and paginates by limit", async () => {
  const { ctx, calls } = mockCtx([{ body: list("payments", [{ id: "tr_1" }, { id: "tr_2" }]) }]);
  const out = await paymentList.execute({ limit: 5 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments");
  assertEquals(queryOf(calls[0].url), { limit: "5" });
  assertEquals(out, { count: 2, items: [{ id: "tr_1" }, { id: "tr_2" }] });
});

Deno.test("payment-list: an empty _embedded still returns an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ body: { count: 0, _links: {} } }]);
  const out = await paymentList.execute({}, ctx);
  assertEquals(out, { count: 0, items: [] });
});
