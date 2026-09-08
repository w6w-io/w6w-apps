import { assertEquals } from "@std/assert";
import phoneNumberGet from "../../actions/phone-number-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("phone-number-get: calls GET /phone-number/{id} (legacy singular path, not /v2)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pn1", number: "+14155551234" } }]);
  const out = await phoneNumberGet.execute({ id: "pn1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/phone-number/pn1");
  assertEquals(out, { id: "pn1", number: "+14155551234" });
});
