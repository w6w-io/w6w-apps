import { assertEquals } from "@std/assert";
import directoryContactList from "../../actions/directory-contact-list.ts";
import { API_ROOT, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("directory-contact-list: contacts are directory-scoped, never top-level", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ contactId: "CID_1" }]) }]);
  const out = await directoryContactList.execute({ directoryId: "POOL_1" }, ctx) as {
    elements: unknown[];
  };

  assertEquals(calls[0].url, `${API_ROOT}/directories/POOL_1/contacts`);
  assertEquals(out.elements, [{ contactId: "CID_1" }]);
});

Deno.test("directory-contact-list: path-escapes the directory id", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await directoryContactList.execute({ directoryId: "POOL/1" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/directories/POOL%2F1/contacts`);
});
