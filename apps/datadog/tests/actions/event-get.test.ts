import { assert, assertEquals } from "@std/assert";
import eventGet from "../../actions/event-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-get: calls GET /api/v2/events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "AAAAA", type: "event" } } }]);
  const out = await eventGet.execute({ eventId: "AAAAA" }, ctx) as { data: { id: string } };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/events/AAAAA");
  assertEquals(out.data.id, "AAAAA");
});

Deno.test("event-get: a pasted id cannot change the request path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await eventGet.execute({ eventId: "a/b?c=1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/events/a%2Fb%3Fc%3D1");
});

/** The v2 UID and the numeric v1 event id are different identifier spaces. */
Deno.test("event-get: the id hint distinguishes the v2 UID from the v1 numeric id", () => {
  const hint = eventGet.params?.find((p) => p.key === "eventId")?.hint ?? "";
  assert(hint.includes("Not the numeric v1 event id"), hint);
});
