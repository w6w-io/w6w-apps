import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  baseUrlFromConnection,
  compact,
  csv,
  errorMessage,
  MauticClient,
  normalizeBaseUrl,
} from "../../lib/client.ts";

Deno.test("normalizeBaseUrl: adds https when no scheme is given", () => {
  assertEquals(normalizeBaseUrl("mautic.example.com"), "https://mautic.example.com");
});

Deno.test("normalizeBaseUrl: keeps an explicit http scheme", () => {
  assertEquals(normalizeBaseUrl("http://mautic.local"), "http://mautic.local");
});

/** Every example in Mautic's own docs writes the base URL ending in `/api`. */
Deno.test("normalizeBaseUrl: strips a trailing /api so the path is not doubled", () => {
  assertEquals(normalizeBaseUrl("https://mautic.example.com/api"), "https://mautic.example.com");
  assertEquals(normalizeBaseUrl("https://mautic.example.com/api/"), "https://mautic.example.com");
});

Deno.test("normalizeBaseUrl: strips a pasted oauth path", () => {
  assertEquals(
    normalizeBaseUrl("https://mautic.example.com/oauth/v2/token"),
    "https://mautic.example.com",
  );
  assertEquals(
    normalizeBaseUrl("https://mautic.example.com/oauth/v2/authorize"),
    "https://mautic.example.com",
  );
});

Deno.test("normalizeBaseUrl: rejects an empty or invalid URL", () => {
  assertThrows(() => normalizeBaseUrl(""), Error, "empty");
  assertThrows(() => normalizeBaseUrl("::::"), Error);
});

Deno.test("baseUrlFromConnection: reads the connection's baseUrl", () => {
  const { ctx } = mockCtx([], { display: { baseUrl: "https://mautic.example.com" } });
  assertEquals(baseUrlFromConnection(ctx.connection), "https://mautic.example.com");
});

Deno.test("baseUrlFromConnection: throws a reconnect message when there is no URL", () => {
  assertThrows(
    () => baseUrlFromConnection(undefined),
    Error,
    "records no instance URL",
  );
});

Deno.test("compact: drops undefined, null, empty string and empty arrays", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: "x", g: [1] }),
    { a: 1, f: "x", g: [1] },
  );
});

Deno.test("csv: splits a comma-separated string and trims", () => {
  assertEquals(csv(" a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(["x", " y "]), ["x", "y"]);
});

Deno.test("errorMessage: reads the system-error envelope {error:{message,code}}", () => {
  const msg = errorMessage(JSON.stringify({ error: { message: "Not found", code: 404 } }));
  assertEquals(msg, "Not found (404)");
});

Deno.test("errorMessage: reads the OAuth envelope {error, error_description}", () => {
  const msg = errorMessage(
    JSON.stringify({ error: "invalid_grant", error_description: "The access token expired." }),
  );
  assertEquals(msg, "invalid_grant: The access token expired.");
});

Deno.test("errorMessage: falls back to the raw text when it is not JSON", () => {
  assertEquals(errorMessage("<html>nope</html>"), "<html>nope</html>");
  assertEquals(errorMessage(""), "");
});

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("MauticClient.request: builds the URL under /api and forwards query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact: { id: 1 } } }], conn);
  const client = new MauticClient(ctx);
  await client.request("/contacts/1", { query: { search: "vip", empty: undefined } });
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1?search=vip");
});

Deno.test("MauticClient.request: throws a message carrying the Mautic error envelope", async () => {
  const { ctx } = mockCtx(
    [{ status: 403, body: { error: { message: "Forbidden", code: 403 } } }],
    conn,
  );
  const client = new MauticClient(ctx);
  let threw = false;
  try {
    await client.request("/contacts/1");
  } catch (err) {
    threw = true;
    assert((err as Error).message.includes("Forbidden (403)"), (err as Error).message);
  }
  assert(threw, "expected request() to throw");
});

Deno.test("MauticClient.requestAll: uses the caller's collection key, not the resource name", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 1, lists: { "3": { id: 3, name: "VIP" } } } },
  ], conn);
  const rows = await new MauticClient(ctx).requestAll("/segments", "lists");
  assertEquals(rows, [{ id: 3, name: "VIP" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("start"), "0");
});

Deno.test("MauticClient.requestAll: normalises a bare-array collection (Tags)", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { total: 1, tags: [{ id: 1, tag: "a" }] } },
  ], conn);
  const rows = await new MauticClient(ctx).requestAll("/tags", "tags");
  assertEquals(rows, [{ id: 1, tag: "a" }]);
});

/** Paging is start/limit, and `start` advances by what the previous page returned. */
Deno.test("MauticClient.requestAll: pages by start/limit until a short page ends it", async () => {
  const full: Record<string, { id: number }> = {};
  for (let i = 1; i <= 100; i++) full[String(i)] = { id: i };
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 101, contacts: full } },
    { status: 200, body: { total: 101, contacts: { "101": { id: 101 } } } },
  ], conn);
  const rows = await new MauticClient(ctx).requestAll("/contacts", "contacts");
  assertEquals(rows.length, 101);
  assertEquals(new URL(calls[0].url).searchParams.get("start"), "0");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
  assertEquals(new URL(calls[1].url).searchParams.get("start"), "100");
});

Deno.test("MauticClient.requestAll: stops early once wantTotal is reached", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 5, contacts: { "1": { id: 1 }, "2": { id: 2 } } } },
  ], conn);
  const rows = await new MauticClient(ctx).requestAll("/contacts", "contacts", {}, 2);
  assertEquals(rows.length, 2);
  assertEquals(calls.length, 1);
});
