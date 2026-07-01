import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-event.ts";

Deno.test("get-event: GETs /events/{id}/ with default expand", async () => {
  const body = { id: "evt-1", name: { text: "Party" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ eventId: "evt-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/evt-1/");
  assertEquals(url.searchParams.get("expand"), "venue,ticket_classes");
  assertEquals(result, body);
});

Deno.test("get-event: honors caller-provided expand", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "evt-2" } }]);
  await action.execute!({ eventId: "evt-2", expand: "logo,category" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("expand"), "logo,category");
});
