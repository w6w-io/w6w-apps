import { assertEquals } from "@std/assert";
import listAgents from "../../actions/list-agents.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-agents: posts to /v2/list-agents with pagination in the QUERY string", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await listAgents.execute({ limit: 10, sortOrder: "ascending", paginationKey: "cur" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/list-agents");
  assertEquals(calls[0].method, "POST");
  assertEquals(queryOf(calls[0].url), {
    limit: "10",
    sort_order: "ascending",
    pagination_key: "cur",
  });
});

Deno.test("list-agents: the channel filter lives in the JSON body, not the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await listAgents.execute({ channel: "voice" }, ctx);

  assertEquals(queryOf(calls[0].url).channel, undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    filter_criteria: { channel: { type: "string", op: "eq", value: "voice" } },
  });
});

Deno.test("list-agents: sends an empty body when no channel filter is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await listAgents.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
