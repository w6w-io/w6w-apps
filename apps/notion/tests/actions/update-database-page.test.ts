import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-database-page.ts";

Deno.test("update-database-page: PATCHes /pages/{id} with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-1" } }]);
  await action.execute({
    pageId: "page-1",
    properties: { Status: { select: { name: "Done" } } },
    archived: false,
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/page-1");
  assertEquals(calls[0].method, "PATCH");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.properties.Status.select.name, "Done");
  assertEquals(sent.archived, false);
  assertEquals("icon" in sent, false);
  assertEquals("cover" in sent, false);
});
