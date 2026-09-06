import { assertEquals } from "@std/assert";
import eventCreate from "../../actions/event-create.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("event-create: POSTs a JSON:API events body with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: single("events", "e1", { title: "Demo" }),
  }]);
  const result = await eventCreate.execute({ title: "Demo", chatEnabled: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "events", attributes: { title: "Demo", chat_enabled: true } },
  });
  assertEquals(result, { id: "e1", type: "events", attributes: { title: "Demo" } });
});

Deno.test("event-create: copy_from_event_id is carried when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: single("events", "e2") }]);
  await eventCreate.execute({ copyFromEventId: "e1" }, ctx);

  assertEquals(
    (JSON.parse(calls[0].body!) as { data: { attributes: Record<string, unknown> } }).data
      .attributes.copy_from_event_id,
    "e1",
  );
});
