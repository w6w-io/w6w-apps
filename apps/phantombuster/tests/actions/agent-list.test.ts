import { assertEquals, assertFalse } from "@std/assert";
import agentList from "../../actions/agent-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("agent-list: calls GET /agents/fetch-all and returns the agents", async () => {
  const agents = [{ id: "1", name: "LinkedIn Profile Scraper" }];
  const { ctx, calls } = mockCtx([{ status: 200, body: agents }]);

  const out = await agentList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/fetch-all");
  assertEquals(out.agents, agents);
});

Deno.test("agent-list: forwards filters and never sets withArgument", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);

  await agentList.execute({
    inputTypes: "profileUrl",
    outputTypes: "fullName",
    agentIds: "1,2",
    withAgentSlotsFactor: true,
  }, ctx);

  const query = queryOf(calls[0].url);
  assertEquals(query.inputTypes, "profileUrl");
  assertEquals(query.outputTypes, "fullName");
  assertEquals(query.agentIds, "1,2");
  assertEquals(query.withAgentSlotsFactor, "true");
  assertFalse("withArgument" in query, "withArgument must never be set by this action");
});

Deno.test("agent-list: omits unset filters from the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await agentList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("agent-list: has no params that expose withArgument", () => {
  const keys = agentList.params?.map((p) => p.key) ?? [];
  assertFalse(keys.includes("withArgument"));
});
