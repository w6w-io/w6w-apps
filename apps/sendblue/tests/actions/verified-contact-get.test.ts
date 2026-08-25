import { assertEquals } from "@std/assert";
import verifiedContactGet from "../../actions/verified-contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("verified-contact-get: GETs /v3/verified-contacts/{phone_number}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { contact: {}, line: {} } } }]);
  await verifiedContactGet.execute({ phoneNumber: "+1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/verified-contacts/%2B1");
});
