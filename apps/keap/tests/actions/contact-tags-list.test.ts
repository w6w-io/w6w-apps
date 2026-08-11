import { assertEquals } from "@std/assert";
import contactTagsList from "../../actions/contact-tags-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = {
  tags: [
    { tag: { id: "10", name: "VIP" }, applied_time: "2026-01-01T00:00:00Z" },
    { tag: { id: "11", name: "Lead" }, applied_time: "2026-02-01T00:00:00Z" },
  ],
  next_page_token: "t2",
};

Deno.test("contact-tags-list: reads the per-contact tag path", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactTagsList.execute({ contactId: "42" }, ctx);
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts/42/tags");
});

/**
 * The rows are `AppliedTag`, so the tag's own id is one level deeper than the
 * `tags` response key suggests — `tags[i].tag.id`, not `tags[i].id`.
 */
Deno.test("contact-tags-list: flattens the tag ids out of the AppliedTag wrapper", async () => {
  const { ctx } = mockCtx([{ body: PAGE }]);
  const out = await contactTagsList.execute({ contactId: "42" }, ctx) as {
    tagIds: string[];
    count: number;
    nextPageToken?: string;
  };
  assertEquals(out.tagIds, ["10", "11"]);
  assertEquals(out.count, 2);
  assertEquals(out.nextPageToken, "t2");
});

Deno.test("contact-tags-list: a row with no nested tag does not produce an undefined id", async () => {
  const { ctx } = mockCtx([{ body: { tags: [{ applied_time: "x" }, { tag: { id: "9" } }] } }]);
  const out = await contactTagsList.execute({ contactId: "42" }, ctx) as { tagIds: string[] };
  assertEquals(out.tagIds, ["9"]);
});

Deno.test("contact-tags-list: the NONE sentinel is passed through as a filter clause", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactTagsList.execute({ contactId: "42", categoryId: "NONE" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "category_id==NONE");
});
