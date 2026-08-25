import { assertEquals } from "@std/assert";
import contactVerify from "../../actions/contact-verify.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-verify: POSTs to /api/v2/contacts/verify", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK" } }]);
  await contactVerify.execute({ number: "+1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/verify");
  assertEquals(jsonBodyOf(calls[0]), { number: "+1" });
});
