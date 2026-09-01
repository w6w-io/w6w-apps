import { assertEquals } from "@std/assert";
import mandateList from "../../actions/mandate-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mandate-list: unwraps _embedded.mandates for one customer", async () => {
  const { ctx, calls } = mockCtx([{ body: list("mandates", [{ id: "mdt_1" }]) }]);
  const out = await mandateList.execute({ customerId: "cst_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/mandates");
  assertEquals(out, { count: 1, items: [{ id: "mdt_1" }] });
});
