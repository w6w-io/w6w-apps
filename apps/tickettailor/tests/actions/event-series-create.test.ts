import { assertEquals } from "@std/assert";
import eventSeriesCreate from "../../actions/event-series-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-series-create: POSTs an x-www-form-urlencoded body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "es_1", object: "event_series" } }]);
  await eventSeriesCreate.execute({ name: "Tulip Festival", venue: "Hackney Downs" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/event_series");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("name"), "Tulip Festival");
  assertEquals(body.get("venue"), "Hackney Downs");
});
