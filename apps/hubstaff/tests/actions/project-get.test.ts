import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs /v2/projects/{project_id}", async () => {
  const body = envelope("project", { id: 841201, type: "project", billable: true });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ project_id: 841201 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/projects/841201");
  assertEquals(result.project.type, "project");
});
