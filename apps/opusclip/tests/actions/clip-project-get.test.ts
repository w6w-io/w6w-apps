import { assertEquals } from "@std/assert";
import clipProjectGet from "../../actions/clip-project-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("clip-project-get: GETs /api/clip-projects/{projectId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "P1", stage: "COMPLETE" } }]);
  const out = await clipProjectGet.execute({ projectId: "P1" }, ctx) as { stage: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/clip-projects/P1");
  assertEquals(out.stage, "COMPLETE");
});

Deno.test("clip-project-get: path-escapes the project id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "a/b" } }]);
  await clipProjectGet.execute({ projectId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/clip-projects/a%2Fb");
});
