import { assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-list: calls GET /v1/projects and unwraps the `projects` key", async () => {
  const { ctx, calls } = mockCtx([
    { body: page("projects", [{ id: "p1" }], { nextCursor: "c2" }) },
  ]);
  const out = await projectList.execute({ workspaceId: "ws1", cursor: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/projects");
  assertEquals(queryOf(calls[0].url), { workspaceId: "ws1", cursor: "c1" });
  assertEquals(out, { items: [{ id: "p1" }], meta: { nextCursor: "c2", pageSize: 1 } });
});

/**
 * Unlike recurring tasks, this endpoint documents `workspaceId` as optional, so
 * an empty workspace must not be turned into a required field.
 */
Deno.test("project-list: workspaceId is optional here", async () => {
  const { ctx, calls } = mockCtx([{ body: page("projects", []) }]);
  await projectList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(projectList.params?.find((p) => p.key === "workspaceId")?.required, false);
});

/** The reference marks `projects` not-required on the response. */
Deno.test("project-list: a response with only meta reads as an empty page", async () => {
  const { ctx } = mockCtx([{ body: { meta: { pageSize: 0 } } }]);
  const out = await projectList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
