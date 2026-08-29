import { assertEquals } from "@std/assert";
import contactStageUpdate from "../../actions/contact-stage-update.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("contact-stage-update: POSTs to /contacts/update_stages with array query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [{ id: "c1" }, { id: "c2" }] } }]);
  const out = await contactStageUpdate.execute(
    { contact_ids: "c1,c2", contact_stage_id: "s1" },
    ctx,
  ) as { contacts: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/update_stages");
  // Not double-bracketed — this pins the bug where a pre-bracketed key plus an array
  // value would produce `contact_ids[][]` instead of `contact_ids[]`.
  assertEquals(queryAllOf(calls[0].url, "contact_ids[]"), ["c1", "c2"]);
  assertEquals(calls[0].url.includes("contact_ids[][]"), false);
  assertEquals(queryOf(calls[0].url).contact_stage_id, "s1");
  assertEquals(out.contacts.length, 2);
});
