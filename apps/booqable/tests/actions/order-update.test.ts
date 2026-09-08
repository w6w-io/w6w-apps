import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/order-update.ts";

Deno.test("order-update: PUTs a JSON:API document with id, including confirmShortage", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "o1" } } }]);
  await action.execute({
    orderId: "o1",
    stopsAt: "2026-06-14T15:18:00.000000+00:00",
    confirmShortage: true,
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/orders/o1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.id, "o1");
  assertEquals(body.data.attributes.stops_at, "2026-06-14T15:18:00.000000+00:00");
  assertEquals(body.data.attributes.confirm_shortage, true);
});
