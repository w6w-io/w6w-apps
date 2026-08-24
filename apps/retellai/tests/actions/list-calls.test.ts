import { assertEquals } from "@std/assert";
import listCalls from "../../actions/list-calls.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-calls: posts to /v3/list-calls with no filter when none given", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await listCalls.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/list-calls");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("list-calls: builds Retell's typed filter grammar for status/agent/numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await listCalls.execute({
    agentId: "agent_1",
    callStatus: "ended",
    fromNumber: "+14157774444",
    toNumber: "+12137774445",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter_criteria, {
    agent: [{ agent_id: "agent_1" }],
    call_status: { type: "enum", op: "in", value: ["ended"] },
    from_number: { type: "string", op: "eq", value: "+14157774444" },
    to_number: { type: "string", op: "eq", value: "+12137774445" },
  });
});

Deno.test("list-calls: pagination key and limit are passed through in the body, not the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await listCalls.execute({ limit: 25, paginationKey: "cursor-1" }, ctx);

  assertEquals(new URL(calls[0].url).search, "");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.limit, 25);
  assertEquals(body.pagination_key, "cursor-1");
});

Deno.test("list-calls: unwraps items/has_more/pagination_key from the response", async () => {
  const { ctx } = mockCtx([{
    body: { items: [{ call_id: "c1" }], has_more: true, pagination_key: "next" },
  }]);
  const out = await listCalls.execute({}, ctx);
  assertEquals(out.items, [{ call_id: "c1" }]);
  assertEquals(out.has_more, true);
  assertEquals(out.pagination_key, "next");
});
