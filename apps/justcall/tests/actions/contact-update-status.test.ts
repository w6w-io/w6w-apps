import { assertEquals } from "@std/assert";
import contactUpdateStatus from "../../actions/contact-update-status.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update-status: PUTs to /v2.1/contacts/status with the DND/DNM/blacklist lists", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1234 }) }]);
  await contactUpdateStatus.execute({ id: 1234, add_to: ["dnd", "dnm"] }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2.1/contacts/status");
  assertEquals(JSON.parse(calls[0].body!), { id: 1234, add_to: ["dnd", "dnm"] });
});
