import { assertEquals, assertRejects } from "@std/assert";
import { compact, formatLumaError, LumaClient, toList } from "../../lib/client.ts";
import { errorBody, mockCtx, queryAllOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  const out: Record<string, unknown> = compact({
    a: undefined,
    b: null,
    c: "",
    d: false,
    e: 0,
    f: "x",
  });
  assertEquals(out, { d: false, e: 0, f: "x" });
});

Deno.test("toList: splits a comma string and trims, drops empties", () => {
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("formatLumaError: surfaces the vendor's message and code", () => {
  const raw = JSON.stringify({ message: "You are not signed in.", code: null });
  const msg = formatLumaError(401, "GET", "/v1/users/get-self", raw);
  assertEquals(msg.includes("401"), true);
  assertEquals(msg.includes("You are not signed in."), true);
});

Deno.test("formatLumaError: a 429 appends the rate-limit hint", () => {
  const raw = JSON.stringify({ message: "Too many requests", code: null });
  const msg = formatLumaError(429, "GET", "/v1/events/get", raw);
  assertEquals(msg.includes("200 requests/minute"), true);
});

Deno.test("formatLumaError: an unparseable body still produces a readable message", () => {
  const msg = formatLumaError(500, "GET", "/v1/events/get", "<html>Internal Server Error</html>");
  assertEquals(msg.includes("500"), true);
  assertEquals(msg.includes("Internal Server Error"), true);
});

Deno.test("LumaClient.json: rejects with the formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("You are not signed in.") }]);
  const client = new LumaClient(ctx);
  const err = await assertRejects(() => Promise.resolve(client.json("/v1/users/get-self")), Error);
  assertEquals(err.message.includes("You are not signed in."), true, err.message);
});

Deno.test("LumaClient.send: array query params are repeated keys, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [], has_more: false } }]);
  const client = new LumaClient(ctx);
  await client.list("/v1/calendars/events/list", { query: { platforms: ["luma", "external"] } });

  assertEquals(queryAllOf(calls[0].url, "platforms"), ["luma", "external"]);
});

Deno.test("LumaClient.send: a JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new LumaClient(ctx);
  await client.json("/v1/events/update", { method: "POST", body: { event_id: "evt-1" } });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ event_id: "evt-1" }));
});

Deno.test("LumaClient.list: returns the {entries, has_more, next_cursor} shape verbatim", async () => {
  const { ctx } = mockCtx([{ body: { entries: [{ id: "1" }], has_more: true, next_cursor: "c" } }]);
  const page = await new LumaClient(ctx).list("/v1/events/guests/list");
  assertEquals(page, { entries: [{ id: "1" }], has_more: true, next_cursor: "c" });
});
