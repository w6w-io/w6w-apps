import { assertEquals, assertRejects } from "@std/assert";
import contactRemoveTags from "../../actions/contact-remove-tags.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-remove-tags: DELETEs a bare array body to /contact/{identifier}/tag", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await contactRemoveTags.execute({ identifier: "id:1", tags: ["old-tag"] }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/tag");
  assertEquals(JSON.parse(calls[0].body!), ["old-tag"]);
});

Deno.test("contact-remove-tags: an empty tag list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactRemoveTags.execute({ identifier: "id:1", tags: [] }, ctx),
    Error,
    "At least one tag",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-remove-tags: is declared idempotent", () => {
  assertEquals(contactRemoveTags.idempotent, true);
});
