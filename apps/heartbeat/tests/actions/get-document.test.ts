import { assertEquals } from "@std/assert";
import getDocument from "../../actions/get-document.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-document: GET /documents/{id}, includes content", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1", name: "Readme", content: "# Hi" } }]);
  const out = await getDocument.execute({ documentID: "d1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v0/documents/d1");
  assertEquals(out.content, "# Hi");
});
