import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GETs /api/v2/contacts/{phone_number}", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", contact: { phone: "+1" } } }]);
  await contactGet.execute({ phoneNumber: "+15551234567" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/%2B15551234567");
});
