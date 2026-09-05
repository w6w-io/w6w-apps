import { assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("project-list: gets /v2/project.list and returns the array unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ data: [{ id: "p1", name: "Acme", created_at: 1 }] }),
  }]);
  const out = await projectList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/project.list");
  assertEquals(out, [{ id: "p1", name: "Acme", created_at: 1 }]);
});

Deno.test("project-list: is a read action with no params (not paginated)", () => {
  assertEquals(projectList.type, "read");
  assertEquals(projectList.params, []);
});
