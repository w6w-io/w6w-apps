import { assertEquals } from "@std/assert";
import addContactTags from "../../actions/add-contact-tags.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("add-contact-tags: POSTs to /contacts/tags and returns undefined for the 202", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await addContactTags.execute({ tags: ["vip"], contactIDs: ["c1"] }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contacts/tags");
  assertEquals(out, undefined);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { tags: ["vip"], contactIDs: ["c1"] });
});

Deno.test("add-contact-tags: selectors combine additively — all four may be sent together", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await addContactTags.execute({
    tags: ["vip"],
    contactIDs: ["c1"],
    emails: ["a@b.com"],
    phones: ["+15551234567"],
    segmentID: "seg1",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contactIDs, ["c1"]);
  assertEquals(body.emails, ["a@b.com"]);
  assertEquals(body.phones, ["+15551234567"]);
  assertEquals(body.segmentID, "seg1");
});

Deno.test("add-contact-tags: tags is required", () => {
  const tags = addContactTags.params?.find((p) => p.key === "tags");
  assertEquals(tags?.required, true);
});

Deno.test("add-contact-tags: is marked idempotent — adding the same tag twice is a no-op on the vendor side", () => {
  assertEquals(addContactTags.idempotent, true);
  assertEquals(addContactTags.type, "perform");
});
