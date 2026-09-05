import { assertEquals } from "@std/assert";
import documentGetExtended from "../../actions/document-get-extended.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-get-extended: fetches GET /docs/{id}/extended", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _id: "d1", inbox_id: "in_1", secret: "s3cr3t-token", pages: 3 },
  }]);

  const result = await documentGetExtended.execute({ documentId: "d1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/docs/d1/extended");
  assertEquals(queryOf(calls[0].url), {});
  // Passed through unaltered — see the action's own doc comment for why this
  // is a deliberate choice, not an oversight.
  assertEquals(result.secret, "s3cr3t-token");
  assertEquals(result.pages, 3);
});

Deno.test("document-get-extended: source=parsed is forwarded as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "d1" } }]);
  await documentGetExtended.execute({ documentId: "d1", source: "parsed" }, ctx);
  assertEquals(queryOf(calls[0].url), { source: "parsed" });
});

Deno.test("document-get-extended: read type", () => {
  assertEquals(documentGetExtended.type, "read");
});
