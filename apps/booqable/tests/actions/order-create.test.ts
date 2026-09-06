import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/order-create.ts";

Deno.test("order-create: POSTs a JSON:API document with starts_at/stops_at", async () => {
  const { ctx, calls } = mockBooqableCtx([{ status: 201, body: { data: { id: "o1" } } }]);
  await action.execute({
    startsAt: "2026-09-25T14:40:01.000000+00:00",
    stopsAt: "2026-11-03T14:40:01.000000+00:00",
    customerId: "cust-1",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/orders");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "orders");
  assertEquals(body.data.attributes.starts_at, "2026-09-25T14:40:01.000000+00:00");
  assertEquals(body.data.attributes.customer_id, "cust-1");
});
