import { assertEquals } from "@std/assert";
import agentFetchOutput from "../../actions/agent-fetch-output.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const OUTPUT = {
  containerId: "c1",
  status: "running",
  output: "console line 1\n",
  outputPos: 42,
  isAgentRunning: true,
  canSoftAbort: true,
};

Deno.test("agent-fetch-output: calls GET /agents/fetch-output with the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: OUTPUT }]);
  const out = await agentFetchOutput.execute({ id: "42" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/fetch-output");
  assertEquals(queryOf(calls[0].url).id, "42");
  assertEquals(out, OUTPUT);
});

Deno.test("agent-fetch-output: forwards incremental-polling params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: OUTPUT }]);

  await agentFetchOutput.execute({
    id: "42",
    fromOutputPos: 10,
    prevContainerId: "c0",
    prevStatus: "running",
    prevRuntimeEventIndex: 2,
  }, ctx);

  const query = queryOf(calls[0].url);
  assertEquals(query.fromOutputPos, "10");
  assertEquals(query.prevContainerId, "c0");
  assertEquals(query.prevStatus, "running");
  assertEquals(query.prevRuntimeEventIndex, "2");
});
