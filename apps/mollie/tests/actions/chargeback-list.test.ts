import { assertEquals } from "@std/assert";
import chargebackList from "../../actions/chargeback-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("chargeback-list: unwraps _embedded.chargebacks account-wide, at /chargebacks", async () => {
  const { ctx, calls } = mockCtx([{ body: list("chargebacks", [{ id: "chb_1" }]) }]);
  const out = await chargebackList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/chargebacks");
  assertEquals(out, { count: 1, items: [{ id: "chb_1" }] });
});
