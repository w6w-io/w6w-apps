import { assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-list: builds query params and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { total_count: 100, count: 1, calls: [{ call_id: "c-1" }] },
  }]);
  const out = await callList.execute(
    { limit: 10, completed: true, answeredBy: "human" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v1/calls");
  assertEquals(queryOf(calls[0].url), { limit: "10", completed: "true", answered_by: "human" });
  assertEquals(out.totalCount, 100);
  assertEquals(out.count, 1);
  assertEquals(out.calls, [{ call_id: "c-1" }]);
});

Deno.test("call-list: falls back to calls.length when total_count/count are absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { calls: [{ call_id: "a" }, { call_id: "b" }] } }]);
  const out = await callList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.totalCount, 2);
  assertEquals(out.count, 2);
});

Deno.test("call-list: an empty response reports zero calls", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await callList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.calls, []);
  assertEquals(out.count, 0);
});

Deno.test("call-list: is a read action", () => {
  assertEquals(callList.type, "read");
});
