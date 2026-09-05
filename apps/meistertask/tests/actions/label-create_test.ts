import { assertEquals } from "@std/assert";
import labelCreate from "../../actions/label-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("label-create: POST /projects/:project_id/labels", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 25, name: "Feature", color: "47cc8a" },
  }]);
  const out = await labelCreate.execute({ projectId: 42, name: "Feature", color: "47cc8a" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects/42/labels");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Feature", color: "47cc8a" });
  assertEquals(out, { id: 25, name: "Feature", color: "47cc8a" });
});
