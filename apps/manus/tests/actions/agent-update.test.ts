import { assertEquals } from "@std/assert";
import agentUpdate from "../../actions/agent-update.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("agent-update: posts agent_id, nickname and about, returns the agent unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ agent: { id: "a1", nickname: "New name", about: "New bio" } }),
  }]);
  const out = await agentUpdate.execute(
    { agentId: "a1", nickname: "New name", about: "New bio" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v2/agent.update");
  assertEquals(JSON.parse(calls[0].body!), {
    agent_id: "a1",
    nickname: "New name",
    about: "New bio",
  });
  assertEquals(out.nickname, "New name");
});

Deno.test("agent-update: is idempotent", () => {
  assertEquals(agentUpdate.idempotent, true);
});
