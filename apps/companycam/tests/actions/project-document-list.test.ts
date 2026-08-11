import { assertEquals } from "@std/assert";
import projectDocumentList from "../../actions/project-document-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-document-list: lists documents with their sizes and URLs", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "115", name: "measurements.pdf", byte_size: 3457903 }],
  }]);
  const page = await projectDocumentList.execute({ projectId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/documents");
  assertEquals((page.items[0] as { byte_size: number }).byte_size, 3457903);
});
