import { assertEquals } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-get: calls GET /v1/projects/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", name: "Launch" } }]);
  const out = await projectGet.execute({ id: "p1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/projects/p1");
  assertEquals(out, { id: "p1", name: "Launch" });
});

Deno.test("project-get: the id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await projectGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/projects/a%2Fb");
});
