import { assertEquals } from "@std/assert";
import eventSeriesStatusUpdate from "../../actions/event-series-status-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-series-status-update: POSTs the new status to /status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "es_1" } }]);
  await eventSeriesStatusUpdate.execute({ eventSeriesId: "es_1", status: "PUBLISHED" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1/status");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("status"), "PUBLISHED");
});
