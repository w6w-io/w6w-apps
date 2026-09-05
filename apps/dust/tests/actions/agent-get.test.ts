import { assertEquals } from "@std/assert";
import agentGet from "../../actions/agent-get.ts";
import { mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("agent-get: hits /assistant/agent_configurations/{sId} with the given variant", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { body: { agentConfiguration: { sId: "a1", name: "Support" } } },
  ]);
  const result = await agentGet.execute({ sId: "a1", variant: "full" }, ctx);

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/agent_configurations/a1`,
  );
  assertEquals(queryOf(calls[0].url), { variant: "full" });
  assertEquals(result, { agentConfiguration: { sId: "a1", name: "Support" } });
});

Deno.test("agent-get: encodes an sId containing special characters", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { agentConfiguration: {} } }]);
  await agentGet.execute({ sId: "a/b c" }, ctx);
  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/agent_configurations/a%2Fb%20c`,
  );
});
