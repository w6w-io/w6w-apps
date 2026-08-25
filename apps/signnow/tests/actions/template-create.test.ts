import { assertEquals } from "@std/assert";
import templateCreate from "../../actions/template-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-create: POSTs document_id and document_name to /template", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "tpl-1" } }]);
  const out = await templateCreate.execute(
    { documentId: "doc-1", documentName: "My Template" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/template");
  assertEquals(bodyOf(calls[0]), { document_id: "doc-1", document_name: "My Template" });
  assertEquals(out.id, "tpl-1");
});
