import { assertEquals, assertRejects } from "@std/assert";
import agentTrain from "../../actions/agent-train.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-train: POST /agents/{id}/train", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await agentTrain.execute({ agentId: "a1" }, ctx) as { success: boolean };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/train");
  assertEquals(out.success, true);
});

Deno.test("agent-train: a retry while training surfaces AGENT_ALREADY_TRAINING", async () => {
  const { ctx } = mockCtx([
    { status: 409, body: errorBody("AGENT_ALREADY_TRAINING", "Training already in progress.") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(agentTrain.execute({ agentId: "a1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("AGENT_ALREADY_TRAINING"), true, err.message);
});
