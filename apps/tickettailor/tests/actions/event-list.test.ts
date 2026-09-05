import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-list: hits GET /events, box-office-wide", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "ev_1" }]) }]);
  await eventList.execute({ venue: "Hackney Downs" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/events");
  assertEquals(queryOf(calls[0].url), { venue: "Hackney Downs" });
});
