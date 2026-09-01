import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track.ts";

Deno.test("track: POSTs identity/event_name/data to /events/track", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  const result = await action.execute!(
    { id: "u1", email: "a@b.com", eventName: "Viewed product", data: { product_name: "Shirt" } },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.getvero.com/api/v2/events/track");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    identity: { id: "u1", email: "a@b.com" },
    event_name: "Viewed product",
    data: { product_name: "Shirt" },
  });
  assertEquals(result, { success: true, message: "Success." });
});

Deno.test("track: accepts id alone, without email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  await action.execute!({ id: "u1", eventName: "Signed up" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).identity, { id: "u1" });
});

Deno.test("track: accepts email alone, without id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  await action.execute!({ email: "a@b.com", eventName: "Signed up" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).identity, { email: "a@b.com" });
});

Deno.test("track: rejects when both id and email are blank", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ eventName: "Signed up" }, ctx),
    Error,
    "either `id` or `email` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track: rejects a blank eventName", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ id: "u1", eventName: "  " }, ctx),
    Error,
    "`eventName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track: source and createdAt map to extras", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  await action.execute!(
    { id: "u1", eventName: "e", source: "Segment.com", createdAt: "2026-01-01T00:00:00Z" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extras, {
    source: "Segment.com",
    created_at: "2026-01-01T00:00:00Z",
  });
});

Deno.test("track: a non-2xx response propagates as an Error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { status: 400, message: "bad request" } }]);
  const err = await assertRejects(
    async () => await action.execute!({ id: "u1", eventName: "e" }, ctx),
    Error,
    "Vero 400",
  );
  assert(err.message.includes("bad request"));
});
