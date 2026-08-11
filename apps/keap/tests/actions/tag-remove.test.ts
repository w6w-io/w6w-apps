import { assertEquals, assertRejects } from "@std/assert";
import tagRemove from "../../actions/tag-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * Deliberately NOT symmetrical with tag-apply: apply answers 200 with a
 * per-contact result map, remove answers 204 with no body at all. Reading a
 * result map off this response is the mistake the asymmetry invites.
 */
Deno.test("tag-remove: a 204 with no body is the documented success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await tagRemove.execute({ tagId: "7", contactIds: "1,2" }, ctx) as {
    status: number;
    requested: string[];
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/tags/7/contacts:removeTags");
  assertEquals(JSON.parse(calls[0].body!), { contact_ids: ["1", "2"] });
  assertEquals(out.status, 204);
  // Only what was asked for — Keap reports nothing per contact here.
  assertEquals(out.requested, ["1", "2"]);
});

Deno.test("tag-remove: an empty id list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await tagRemove.execute({ tagId: "7", contactIds: "" }, ctx),
    Error,
    "At least one contact ID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("tag-remove: is declared idempotent", () => {
  assertEquals(tagRemove.idempotent, true);
});
