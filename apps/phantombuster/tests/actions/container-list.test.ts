import { assertEquals } from "@std/assert";
import containerList from "../../actions/container-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("container-list: calls GET /containers/fetch-all with agentId", async () => {
  const body = { maxLimitReached: false, containers: [{ id: "c1", status: "finished" }] };
  const { ctx, calls } = mockCtx([{ status: 200, body }]);

  const out = await containerList.execute({ agentId: "42" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/containers/fetch-all");
  assertEquals(queryOf(calls[0].url).agentId, "42");
  assertEquals(out, body);
});

Deno.test("container-list: forwards mode, limit and withRuntimeEvents", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { maxLimitReached: false, containers: [] },
  }]);

  await containerList.execute({
    agentId: "42",
    mode: "finalized",
    limit: 5,
    withRuntimeEvents: true,
  }, ctx);

  const query = queryOf(calls[0].url);
  assertEquals(query.mode, "finalized");
  assertEquals(query.limit, "5");
  assertEquals(query.withRuntimeEvents, "true");
});
