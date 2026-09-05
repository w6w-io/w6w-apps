import { assertEquals, assertRejects } from "@std/assert";
import contactAddTags from "../../actions/contact-add-tags.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-add-tags: POSTs a bare array body to /contact/{identifier}/tag", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await contactAddTags.execute({ identifier: "id:1", tags: ["vip", "premium"] }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/tag");
  assertEquals(JSON.parse(calls[0].body!), ["vip", "premium"]);
});

Deno.test("contact-add-tags: a single string tag is wrapped into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await contactAddTags.execute({ identifier: "id:1", tags: "vip" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), ["vip"]);
});

Deno.test("contact-add-tags: more than 10 tags is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const tags = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
  await assertRejects(
    async () => await contactAddTags.execute({ identifier: "id:1", tags }, ctx),
    Error,
    "At most 10",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-add-tags: is declared idempotent — re-adding an existing tag is a no-op", () => {
  assertEquals(contactAddTags.idempotent, true);
});
