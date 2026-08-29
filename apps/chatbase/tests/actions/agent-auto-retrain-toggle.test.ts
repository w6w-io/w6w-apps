import { assertEquals } from "@std/assert";
import agentAutoRetrainToggle from "../../actions/agent-auto-retrain-toggle.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-auto-retrain-toggle: PUT /agents/{id}/auto-retrain with enabled body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await agentAutoRetrainToggle.execute({ agentId: "a1", enabled: true }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/auto-retrain");
  assertEquals(JSON.parse(calls[0].body!), { enabled: true });
});

Deno.test("agent-auto-retrain-toggle: enabled:false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await agentAutoRetrainToggle.execute({ agentId: "a1", enabled: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { enabled: false });
});
