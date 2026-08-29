import { assertEquals } from "@std/assert";
import agentUpdate from "../../actions/agent-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-update: PUT /agents/{id} with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await agentUpdate.execute({ agentId: "a1", name: "New Name" }, ctx) as {
    success: boolean;
  };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
  assertEquals(out.success, true);
});

Deno.test("agent-update: omitting both fields sends an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await agentUpdate.execute({ agentId: "a1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
