import { assertEquals } from "@std/assert";
import documentList from "../../actions/document-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-list: GETs /documents/ with page/limit query params (not offset)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await documentList.execute({ page: 2, limit: 25, status: "si" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/documents/");
  const q = queryOf(calls[0]);
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("limit"), "25");
  assertEquals(q.get("status"), "si");
  assertEquals(q.has("offset"), false);
});

Deno.test("document-list: returns the paginated envelope", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { count: 1, next: null, previous: null, results: [{ uuid: "d1" }] },
  }]);
  const out = await documentList.execute({}, ctx) as { count: number };
  assertEquals(out.count, 1);
});
