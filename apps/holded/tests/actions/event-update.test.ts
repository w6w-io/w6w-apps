import { assertEquals } from "@std/assert";
import eventUpdate from "../../actions/event-update.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("event-update: metadata — idempotent partial update", () => {
  assertEquals(eventUpdate.type, "perform");
  assertEquals(eventUpdate.idempotent, true);
});

Deno.test("event-update: PUT /events/{eventId} with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "e1") }]);
  const result = asMutation(
    await eventUpdate.execute({ eventId: "e1", name: "Coffee with Patrick" }, ctx),
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/events/e1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Coffee with Patrick" });
  assertEquals(result.info, "Updated");
});
