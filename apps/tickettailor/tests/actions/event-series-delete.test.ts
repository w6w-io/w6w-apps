import { assertEquals } from "@std/assert";
import eventSeriesDelete from "../../actions/event-series-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-series-delete: DELETEs and returns the 200 body (never expects 204)", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "es_1", object: "event_series", deleted: "true" } },
  ]);
  const result = await eventSeriesDelete.execute({ eventSeriesId: "es_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1");
  assertEquals(result.deleted, "true");
});
