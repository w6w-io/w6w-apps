import { assertEquals } from "@std/assert";
import listDocuments from "../../actions/list-documents.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-documents: GET /documents, wrapped under `documents` — bare array, no hasMore", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "d1", name: "Readme" }] }]);
  const out = await listDocuments.execute({ startingAfter: "d0", limit: 50 }, ctx) as {
    documents: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/v0/documents");
  assertEquals(queryOf(calls[0].url), { startingAfter: "d0", limit: "50" });
  assertEquals(out.documents.length, 1);
  // Confirms the shape really is a bare array with no sibling `hasMore` key —
  // the finding this action's own docs warn about.
  assertEquals(Object.keys(out), ["documents"]);
});
