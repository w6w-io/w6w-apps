import { assertEquals, assertRejects } from "@std/assert";
import agentDelete from "../../actions/agent-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-delete: DELETE /agents/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await agentDelete.execute({ agentId: "a1" }, ctx) as { success: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1");
  assertEquals(out.success, true);
});

Deno.test("agent-delete: a repeat delete surfaces AGENT_NOT_FOUND rather than succeeding again", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("AGENT_NOT_FOUND", "Agent not found."),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(agentDelete.execute({ agentId: "a1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("AGENT_NOT_FOUND"), true, err.message);
});
