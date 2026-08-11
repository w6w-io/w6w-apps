import { assertEquals } from "@std/assert";
import projectLabelList from "../../actions/project-label-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-label-list: lists labels, which are Tag rows", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1", display_value: "Roof", value: "roof" }] }]);
  const page = await projectLabelList.execute({ projectId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/labels");
  assertEquals((page.items[0] as { value: string }).value, "roof");
});
