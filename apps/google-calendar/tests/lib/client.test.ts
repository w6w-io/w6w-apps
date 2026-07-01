import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { encodeCalendarId, GoogleCalendarClient } from "../../lib/client.ts";

Deno.test("client: prefixes API_URL and returns parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { kind: "calendar#calendar", id: "primary" } }]);
  const client = new GoogleCalendarClient(ctx);
  const result = await client.request<{ id: string }>("/calendars/primary");
  assertEquals(result.id, "primary");
  assertEquals(new URL(calls[0].url).host, "www.googleapis.com");
  assertEquals(new URL(calls[0].url).pathname, "/calendar/v3/calendars/primary");
});

Deno.test("client: skips undefined/null/empty query params, keeps zeros and false", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const client = new GoogleCalendarClient(ctx);
  await client.request("/x", {
    query: {
      a: undefined,
      b: null,
      c: "",
      d: 0,
      e: false,
      f: "keep",
    },
  });
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("a"));
  assert(!params.has("b"));
  assert(!params.has("c"));
  assertEquals(params.get("d"), "0");
  assertEquals(params.get("e"), "false");
  assertEquals(params.get("f"), "keep");
});

Deno.test("client: JSON-encodes bodies and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new GoogleCalendarClient(ctx);
  await client.request("/freeBusy", { method: "POST", body: { timeMin: "t" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, `{"timeMin":"t"}`);
});

Deno.test("client: throws with status + detail on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: "not here" }]);
  const client = new GoogleCalendarClient(ctx);
  await assertRejects(
    async () => await client.request("/missing"),
    Error,
    "404",
  );
});

Deno.test("client: returns undefined for 204 No Content", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const client = new GoogleCalendarClient(ctx);
  const result = await client.request<void>("/x", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("encodeCalendarId: leaves `primary` untouched and %40-encodes emails", () => {
  assertEquals(encodeCalendarId("primary"), "primary");
  assertEquals(encodeCalendarId("foo@example.com"), "foo%40example.com");
  // Idempotent: an already-encoded value stays encoded once.
  assertEquals(encodeCalendarId("foo%40example.com"), "foo%40example.com");
});
