import { assertEquals, assertRejects } from "@std/assert";
import findLeads from "../../actions/find-leads.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("find-leads: is a search action", () => {
  assertEquals(findLeads.type, "search");
});

Deno.test("find-leads: builds the query object from named params, ANDed", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 1 }, { id: 2 }] }]);
  const result = await findLeads.execute({ status: 10, accountId: "5", limit: 10 }, ctx);

  assertEquals(rpcBody(calls[0]).method, "findLeads");
  const params = rpcBody(calls[0]).params;
  assertEquals(params.query, { status: 10, accountId: "5" });
  assertEquals(params.limit, 10);
  assertEquals(result.records.length, 2);
  assertEquals(result.count, 2);
});

Deno.test("find-leads: merges the raw JSON query escape hatch over named fields", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await findLeads.execute({ status: 10, query: '{"tag": ["hot"], "status": 11}' }, ctx);

  // The raw query is spread LAST, so it can override a named field too.
  assertEquals(rpcBody(calls[0]).params.query, { status: 11, tag: ["hot"] });
});

Deno.test("find-leads: fullRecords flips stubResponses to false", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await findLeads.execute({ fullRecords: true }, ctx);
  assertEquals(rpcBody(calls[0]).params.stubResponses, false);
});

Deno.test("find-leads: rejects invalid JSON in the query escape hatch", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => findLeads.execute({ query: "{not json" }, ctx) as Promise<unknown>);
});
