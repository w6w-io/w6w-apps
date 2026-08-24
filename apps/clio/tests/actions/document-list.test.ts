import { assertEquals } from "@std/assert";
import documentList from "../../actions/document-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-list: calls GET /documents.json", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await documentList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/documents.json");
});

Deno.test("document-list: forwards matter and parent-folder filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await documentList.execute({ matterId: 2, parentId: 10 }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.matter_id, "2");
  assertEquals(q.parent_id, "10");
});
