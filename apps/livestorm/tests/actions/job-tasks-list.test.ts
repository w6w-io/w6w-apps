import { assertEquals } from "@std/assert";
import jobTasksList from "../../actions/job-tasks-list.ts";
import type { JsonApiListResponse } from "../../lib/client.ts";
import { list, mockCtx, pathOf, resource } from "../_helpers.ts";

Deno.test("job-tasks-list: GETs /jobs/{id}/tasks", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("tasks", "t1")]) }]);
  const result = await jobTasksList.execute({ id: "j1" }, ctx) as JsonApiListResponse;

  assertEquals(pathOf(calls[0].url), "/v1/jobs/j1/tasks");
  assertEquals(result.data.length, 1);
});
