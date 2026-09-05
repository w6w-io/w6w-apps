import { assertEquals } from "@std/assert";
import agentList from "../../actions/agent-list.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("agent-list: gets /v2/agent.list and returns the array unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: [{ id: "a1", nickname: "Bot" }] }) }]);
  const out = await agentList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/agent.list");
  assertEquals(out, [{ id: "a1", nickname: "Bot" }]);
});
