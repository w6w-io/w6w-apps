import { assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-list: GET /projects with defaults", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1, name: "Getting Started" }] }]);
  const out = await projectList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, [{ id: 1, name: "Getting Started" }]);
});

Deno.test("project-list: forwards status/pagination/sort", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await projectList.execute({ status: "archived", items: 25, page: 2, sort: "-id" }, ctx);
  assertEquals(queryOf(calls[0].url), { status: "archived", items: "25", page: "2", sort: "-id" });
});
