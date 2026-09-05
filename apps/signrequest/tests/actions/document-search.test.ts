import { assertEquals } from "@std/assert";
import documentSearch from "../../actions/document-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-search: GETs /documents-search/ with the query params set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await documentSearch.execute({ q: "acme", who: "o", page: 1 }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/documents-search/");
  const q = queryOf(calls[0]);
  assertEquals(q.get("q"), "acme");
  assertEquals(q.get("who"), "o");
  assertEquals(q.get("page"), "1");
});
