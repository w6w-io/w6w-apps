import { assertEquals } from "@std/assert";
import verifiedContactCreate from "../../actions/verified-contact-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("verified-contact-create: POSTs to the bare /v3/verified-contacts (no /api prefix)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { contact: {}, line: {} } } }]);
  await verifiedContactCreate.execute({ phoneNumber: "+15551234567" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/verified-contacts");
  assertEquals(jsonBodyOf(calls[0]), { phone_number: "+15551234567" });
});
