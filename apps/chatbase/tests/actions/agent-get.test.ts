import { assertEquals, assertRejects } from "@std/assert";
import agentGet from "../../actions/agent-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-get: GET /agents/{id}, bare object, no envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a1", name: "Support Bot" } }]);
  const out = await agentGet.execute({ agentId: "a1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1");
  assertEquals(out.name, "Support Bot");
});

Deno.test("agent-get: a slash in agentId cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a1" } }]);
  await agentGet.execute({ agentId: "a1/../../other" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1%2F..%2F..%2Fother");
});

Deno.test("agent-get: surfaces the v2 error code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("AGENT_NOT_FOUND", "Agent not found."),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(agentGet.execute({ agentId: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("AGENT_NOT_FOUND"), true, err.message);
});
