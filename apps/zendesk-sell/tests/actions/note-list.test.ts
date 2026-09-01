import { assertEquals } from "@std/assert";
import noteList from "../../actions/note-list.ts";
import { listEnvelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("note-list: maps resourceType/q filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await noteList.execute({ resourceType: "deal", q: "important" }, ctx);
  assertEquals(queryOf(calls[0].url), { resource_type: "deal", q: "important" });
});
