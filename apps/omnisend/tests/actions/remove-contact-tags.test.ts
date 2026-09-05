import { assertEquals } from "@std/assert";
import removeContactTags from "../../actions/remove-contact-tags.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("remove-contact-tags: DELETEs /contacts/tags with a JSON body, not query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await removeContactTags.execute({ tags: ["vip"], emails: ["a@b.com"] }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/contacts/tags");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out, undefined);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { tags: ["vip"], emails: ["a@b.com"] });
});

Deno.test("remove-contact-tags: tags is required", () => {
  const tags = removeContactTags.params?.find((p) => p.key === "tags");
  assertEquals(tags?.required, true);
});

Deno.test("remove-contact-tags: is marked idempotent", () => {
  assertEquals(removeContactTags.idempotent, true);
  assertEquals(removeContactTags.type, "perform");
});
