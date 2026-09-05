import { assertEquals } from "@std/assert";
import agentList from "../../actions/agent-list.ts";
import { mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("agent-list: defaults view to 'list' and returns the agentConfigurations array", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { body: { agentConfigurations: [{ sId: "a1" }] } },
  ]);
  const result = await agentList.execute({ view: "list" }, ctx);

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/agent_configurations`,
  );
  assertEquals(queryOf(calls[0].url), { view: "list" });
  assertEquals(result, { agentConfigurations: [{ sId: "a1" }] });
});

Deno.test("agent-list: withAuthors is serialised as a string, and omitted when unset", async () => {
  const { ctx: withCtx, calls: withCalls } = mockCtxWithConnection([
    { body: { agentConfigurations: [] } },
  ]);
  await agentList.execute({ view: "all", withAuthors: true }, withCtx);
  assertEquals(queryOf(withCalls[0].url), { view: "all", withAuthors: "true" });

  const { ctx: bareCtx, calls: bareCalls } = mockCtxWithConnection([
    { body: { agentConfigurations: [] } },
  ]);
  await agentList.execute({}, bareCtx);
  assertEquals(queryOf(bareCalls[0].url), {});
});
