import { assertEquals } from "@std/assert";
import action from "../../actions/list-document-categories.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-document-categories: maps id/name", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: [
          { id: 1, type: "DocumentCategory", attributes: { name: "Certificates of employment" } },
          { id: 2, type: "DocumentCategory", attributes: { name: "Other documents" } },
        ],
      },
    },
  ]);
  const out = await action.execute({}, ctx) as { categories: Array<{ id: number; name: string }> };
  assertEquals(pathOf(calls[0].url), "/v1/company/document-categories");
  assertEquals(out.categories, [
    { id: 1, name: "Certificates of employment" },
    { id: 2, name: "Other documents" },
  ]);
});
