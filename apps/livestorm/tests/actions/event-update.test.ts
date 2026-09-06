import { assertEquals } from "@std/assert";
import eventUpdate from "../../actions/event-update.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("event-update: PATCHes only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: single("events", "e1", { title: "New" }) }]);
  const result = await eventUpdate.execute({ id: "e1", title: "New" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "events", attributes: { title: "New" } },
  });
  assertEquals(result, { id: "e1", type: "events", attributes: { title: "New" } });
});
