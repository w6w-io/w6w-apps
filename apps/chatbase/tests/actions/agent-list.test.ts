import { assertEquals } from "@std/assert";
import agentList from "../../actions/agent-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("agent-list: GET /agents, defaults query untouched when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "a1", name: "Bot" }]) }]);
  const out = await agentList.execute({}, ctx) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.data.length, 1);
});

Deno.test("agent-list: forwards cursor and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await agentList.execute({ cursor: "abc", limit: 5 }, ctx);
  assertEquals(queryOf(calls[0].url), { cursor: "abc", limit: "5" });
});

Deno.test("agent-list: returns the pagination envelope verbatim", async () => {
  const { ctx } = mockCtx([{ body: page([{ id: "a1" }], { cursor: "next", hasMore: true }) }]);
  const out = await agentList.execute({}, ctx) as {
    pagination: { cursor: string; hasMore: boolean };
  };
  assertEquals(out.pagination.cursor, "next");
  assertEquals(out.pagination.hasMore, true);
});
