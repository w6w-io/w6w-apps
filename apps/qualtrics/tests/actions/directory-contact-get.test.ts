import { assertEquals } from "@std/assert";
import directoryContactGet from "../../actions/directory-contact-get.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

Deno.test("directory-contact-get: calls GET /directories/{id}/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ contactId: "CID_1", email: "a@b.example" }) },
  ]);
  const out = await directoryContactGet.execute(
    { directoryId: "POOL_1", contactId: "CID_1" },
    ctx,
  ) as { contactId: string };

  assertEquals(calls[0].url, `${API_ROOT}/directories/POOL_1/contacts/CID_1`);
  assertEquals(out.contactId, "CID_1");
});

Deno.test("directory-contact-get: path-escapes both ids", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await directoryContactGet.execute({ directoryId: "POOL 1", contactId: "CID/1" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/directories/POOL%201/contacts/CID%2F1`);
});
