import { assertEquals } from "@std/assert";
import eventGet from "../../actions/event-get.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("event-get: GETs /events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: single("events", "e1", { title: "Demo" }) }]);
  const result = await eventGet.execute({ id: "e1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1");
  assertEquals(result, { id: "e1", type: "events", attributes: { title: "Demo" } });
});
