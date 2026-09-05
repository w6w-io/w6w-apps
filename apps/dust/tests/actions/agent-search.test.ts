import { assertEquals } from "@std/assert";
import agentSearch from "../../actions/agent-search.ts";
import { mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("agent-search: hits the search endpoint with q", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { body: { agentConfigurations: [{ sId: "a1", name: "Support Agent" }] } },
  ]);
  const result = await agentSearch.execute({ q: "support" }, ctx);

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/agent_configurations/search`,
  );
  assertEquals(queryOf(calls[0].url), { q: "support" });
  assertEquals(result, { agentConfigurations: [{ sId: "a1", name: "Support Agent" }] });
});
