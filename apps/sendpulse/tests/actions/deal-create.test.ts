import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-create.ts";

Deno.test("deal-create: POSTs pipelineId and stepId", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 1 } } }]);
  await action.execute!({ pipelineId: 1, stepId: 2 }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/deals");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? ""), { pipelineId: 1, stepId: 2 });
});

Deno.test("deal-create: contactId is wrapped in the array the vendor's `contact` field expects", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await action.execute!({ pipelineId: 1, stepId: 2, contactId: 99, name: "Deal A" }, ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.contact, [99]);
  assertEquals(body.name, "Deal A");
});

Deno.test("deal-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
