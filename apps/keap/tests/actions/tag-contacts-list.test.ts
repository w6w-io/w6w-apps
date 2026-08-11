import { assertEquals } from "@std/assert";
import tagContactsList from "../../actions/tag-contacts-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = {
  contacts: [{ id: "1", email: "a@b.com", applied_time: "2026-01-01T00:00:00Z" }],
  next_page_token: "n",
};

Deno.test("tag-contacts-list: reads the tagged-contacts path", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await tagContactsList.execute({ tagId: "7" }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/tags/7/contacts");
  assertEquals(out.count, 1);
});

/**
 * "If NONE is passed in for `email`, `given_name`, or `family_name`, it will
 * check for the non-existence of that field" — the only way to ask this
 * question here.
 */
Deno.test("tag-contacts-list: the NONE sentinel is passed through untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await tagContactsList.execute({ tagId: "7", email: "NONE" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "email==NONE");
});

Deno.test("tag-contacts-list: the applied-time window uses Keap's own clause names", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await tagContactsList.execute(
    { tagId: "7", sinceAppliedTime: "2026-01-01T00:00:00.000Z" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).filter, "since_applied_time==2026-01-01T00:00:00.000Z");
});

/**
 * The reverse relationship returns `AppliedTag` (a wrapper). This direction
 * returns `TaggedContact`, flat, with `applied_time` alongside the contact's
 * own fields.
 */
Deno.test("tag-contacts-list: rows are flat, with applied_time alongside the contact fields", async () => {
  const { ctx } = mockCtx([{ body: PAGE }]);
  const out = await tagContactsList.execute({ tagId: "7" }, ctx) as {
    contacts: Array<Record<string, unknown>>;
  };
  assertEquals(out.contacts[0].applied_time, "2026-01-01T00:00:00Z");
  assertEquals(out.contacts[0].id, "1");
});
