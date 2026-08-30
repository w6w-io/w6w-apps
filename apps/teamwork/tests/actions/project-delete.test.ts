import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/project-delete.ts";

Deno.test("project-delete: DELETEs the V1 /projects/{id}.json endpoint", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { STATUS: "OK" } }]);
  const out = await action.execute({ projectId: 42 }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/42.json");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { success: true });
});
