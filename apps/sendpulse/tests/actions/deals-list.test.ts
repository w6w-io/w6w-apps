import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deals-list.ts";

Deno.test("deals-list: POSTs a filter body with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: { total: 0 } } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/deals/get-list");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? ""), { limit: 10, offset: 0 });
});

Deno.test("deals-list: pipelineId narrows to a single-element pipelineIds array", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: { total: 0 } } }]);
  await action.execute!({ pipelineId: 7, name: "Acme" }, ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.pipelineIds, [7]);
  assertEquals(body.name, "Acme");
});

Deno.test("deals-list: returns the vendor's data/meta envelope untouched", async () => {
  const { ctx } = mockCtx([{ body: { data: [{ id: 1 }], meta: { total: 1 } } }]);
  const result = await action.execute!({}, ctx);
  assertEquals(result, { data: [{ id: 1 }], meta: { total: 1 } });
});
