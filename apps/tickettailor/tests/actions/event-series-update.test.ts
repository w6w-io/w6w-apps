import { assertEquals } from "@std/assert";
import eventSeriesUpdate from "../../actions/event-series-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-series-update: POSTs to the resource's own URL (no PATCH/PUT)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "es_1", name: "New Name" } }]);
  const result = await eventSeriesUpdate.execute(
    { eventSeriesId: "es_1", name: "New Name" },
    ctx,
  ) as {
    name: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1");
  assertEquals(result.name, "New Name");
});
