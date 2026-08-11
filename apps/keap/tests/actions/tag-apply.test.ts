import { assertEquals, assertRejects } from "@std/assert";
import tagApply from "../../actions/tag-apply.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-apply: POSTs the contact ids to the colon-suffixed custom method", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: { "123": "SUCCESS" } } }]);
  await tagApply.execute({ tagId: "7", contactIds: "123" }, ctx);
  assertEquals(calls[0].method, "POST");
  // The colon is a literal path character (Google-style custom method) and must
  // not be percent-encoded.
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/tags/7/contacts:applyTags");
  assertEquals(JSON.parse(calls[0].body!), { contact_ids: ["123"] });
});

/** Keap wants the ids as strings even though every id in this API is numeric. */
Deno.test("tag-apply: ids are sent as strings, comma input accepted", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: {} } }]);
  await tagApply.execute({ tagId: "7", contactIds: "123, 456 ,789" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { contact_ids: ["123", "456", "789"] });
});

/**
 * The response is 200 even when part of the batch failed — the failure is a
 * value inside the per-contact map, not the status.
 */
Deno.test("tag-apply: a 200 with a partial failure is split into applied and failed", async () => {
  const { ctx } = mockCtx([{
    body: { results: { "1": "SUCCESS", "2": "CONTACT_DOES_NOT_EXIST", "3": "SUCCESS" } },
  }]);
  const out = await tagApply.execute({ tagId: "7", contactIds: "1,2,3" }, ctx) as {
    applied: string[];
    failed: Record<string, string>;
  };
  assertEquals(out.applied, ["1", "3"]);
  assertEquals(out.failed, { "2": "CONTACT_DOES_NOT_EXIST" });
});

Deno.test("tag-apply: an unrecognised outcome counts as a failure, not a silent pass", async () => {
  const { ctx } = mockCtx([{ body: { results: { "1": "SOMETHING_NEW" } } }]);
  const out = await tagApply.execute({ tagId: "7", contactIds: "1" }, ctx) as {
    applied: string[];
    failed: Record<string, string>;
  };
  assertEquals(out.applied, []);
  assertEquals(out.failed, { "1": "SOMETHING_NEW" });
});

Deno.test("tag-apply: an empty id list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await tagApply.execute({ tagId: "7", contactIds: " , " }, ctx),
    Error,
    "At least one contact ID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("tag-apply: is declared idempotent — re-tagging is a no-op on Keap's side", () => {
  assertEquals(tagApply.idempotent, true);
});
