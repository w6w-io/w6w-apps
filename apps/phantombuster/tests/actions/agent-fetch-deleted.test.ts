import { assertEquals } from "@std/assert";
import agentFetchDeleted from "../../actions/agent-fetch-deleted.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-fetch-deleted: calls GET /agents/fetch-deleted with no query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "1", name: "Deleted Agent" }] }]);

  const out = await agentFetchDeleted.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/fetch-deleted");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.agents, [{ id: "1", name: "Deleted Agent" }]);
});

Deno.test("agent-fetch-deleted: returns an empty list without error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const out = await agentFetchDeleted.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.agents, []);
});
