import { assertEquals } from "@std/assert";
import projectLabelDelete from "../../actions/project-label-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-label-delete: removes one label by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await projectLabelDelete.execute({ projectId: "1", labelId: "48892885" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/labels/48892885");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});

Deno.test("project-label-delete: says it takes an id where Add takes display values", () => {
  const labelId = projectLabelDelete.params!.find((p) => p.key === "labelId")!;
  assertEquals(/display values/.test(labelId.hint!), true);
});
