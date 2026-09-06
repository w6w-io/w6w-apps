import { assertEquals } from "@std/assert";
import eventReplace from "../../actions/event-replace.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("event-replace: PUTs the event", async () => {
  const { ctx, calls } = mockCtx([{ body: single("events", "e1", { title: "New" }) }]);
  const result = await eventReplace.execute({ id: "e1", title: "New" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(result, { id: "e1", type: "events", attributes: { title: "New" } });
});
