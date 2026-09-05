import { assertEquals } from "@std/assert";
import labelList from "../../actions/label-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("label-list: GET /projects/:project_id/labels", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 24, name: "Bug" }] }]);
  const out = await labelList.execute({ projectId: 42 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects/42/labels");
  assertEquals(out, [{ id: 24, name: "Bug" }]);
});
