import { assertEquals } from "@std/assert";
import methodList from "../../actions/method-list.ts";
import { list, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("method-list: fetches /methods and unwraps _embedded.methods", async () => {
  const { ctx, calls } = mockCtx([{ body: list("methods", [{ id: "ideal" }, { id: "paypal" }]) }]);
  const out = await methodList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/methods");
  assertEquals(out, { count: 2, items: [{ id: "ideal" }, { id: "paypal" }] });
});

Deno.test("method-list: encodes amount as deepObject query params, not JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: list("methods", []) }]);
  await methodList.execute({ amountValue: "10.00", amountCurrency: "EUR" }, ctx);

  assertEquals(queryOf(calls[0].url), { "amount[value]": "10.00", "amount[currency]": "EUR" });
});
