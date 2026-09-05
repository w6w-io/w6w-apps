import { assertEquals, assertRejects } from "@std/assert";
import notesCreate from "../../actions/notes-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("notes-create: POSTs content and entity ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 22985, content: "Had a lunch meeting" } }]);
  await notesCreate.execute(
    {
      content: "Had a lunch meeting with Jane and John today.",
      personIds: "38706,624289",
      organizationIds: "120611418",
      opportunityIds: "167",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/notes");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.person_ids, [38706, 624289]);
  assertEquals(body.organization_ids, [120611418]);
  assertEquals(body.opportunity_ids, [167]);
});

Deno.test("notes-create: a parent_id alone satisfies the 'at least one' requirement", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 22987 } }]);
  await notesCreate.execute({ content: "This is a reply.", parentId: 22984 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).parent_id, 22984);
});

Deno.test("notes-create: rejects when no entity or parent is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => {
      await notesCreate.execute({ content: "orphan note" }, ctx);
    },
    Error,
    "At least one of",
  );
});
