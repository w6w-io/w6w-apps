import { assertEquals } from "@std/assert";
import agentClone from "../../actions/agent-clone.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-clone: POST /agents/{id}/clone returns the new agent id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "a2" } }]);
  const out = await agentClone.execute({ agentId: "a1" }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/clone");
  assertEquals(out.id, "a2");
});
