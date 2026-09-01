import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  bitFlag,
  compact,
  CrispClient,
  csv,
  formatError,
  TIER_HEADER_VALUE,
  websiteIdFromConnection,
} from "../../lib/client.ts";

Deno.test("client: builds the website-scoped URL and adds the tier header", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { error: false, reason: "resolved", data: { ok: 1 } } }],
    "site_1",
  );
  const client = new CrispClient(ctx);
  const data = await client.request<{ ok: number }>("/conversation/session_x");
  assertEquals(data, { ok: 1 });
  const call = calls[0];
  assertEquals(new URL(call.url).pathname, "/v1/website/site_1/conversation/session_x");
  assertEquals(call.headers["x-crisp-tier"], TIER_HEADER_VALUE);
  assertEquals(call.headers["accept"], "application/json");
  // No Authorization header — that is the `sign` hook's job, never the client's.
  assertEquals(call.headers["authorization"], undefined);
});

Deno.test("client: appends non-empty query params only", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, data: [] } }], "site_1");
  const client = new CrispClient(ctx);
  await client.request("/conversations/1", {
    query: { per_page: 20, search_query: "", filter_unread: undefined },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("per_page"), "20");
  assertEquals(url.searchParams.has("search_query"), false);
  assertEquals(url.searchParams.has("filter_unread"), false);
});

Deno.test("client: JSON-encodes a request body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { error: false, data: { fingerprint: 1 } },
  }], "site_1");
  const client = new CrispClient(ctx);
  await client.request("/conversation/x/message", {
    method: "POST",
    body: { type: "text", content: "hi" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { type: "text", content: "hi" });
});

Deno.test("client: throws on a non-ok HTTP status, message carries the vendor reason", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: { error: true, reason: "session_not_found", data: {} } },
  ], "site_1");
  const client = new CrispClient(ctx);
  await assertRejects(
    () => client.request("/conversation/nope"),
    Error,
    "session_not_found",
  );
});

Deno.test("client: throws when the envelope itself reports error:true even on HTTP 200", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { error: true, reason: "not_allowed", data: {} } },
  ], "site_1");
  const client = new CrispClient(ctx);
  await assertRejects(() => client.request("/website"), Error, "not_allowed");
});

Deno.test("client: throws a clear error when the connection carries no websiteId", () => {
  const { ctx } = mockCtx([]);
  let threw = false;
  try {
    new CrispClient(ctx);
  } catch (e) {
    threw = true;
    assert(String(e).includes("website id"));
  }
  assert(threw, "expected constructing CrispClient without a websiteId to throw");
});

Deno.test("websiteIdFromConnection: reads display.websiteId", () => {
  assertEquals(
    websiteIdFromConnection({ display: { websiteId: "abc" } } as never),
    "abc",
  );
});

Deno.test("formatError: falls back to bare status when there is no body or reason", () => {
  assertEquals(formatError(500, undefined), "HTTP 500");
  assertEquals(formatError(500, { error: true }), "HTTP 500");
  assertEquals(formatError(404, { error: true, reason: "not_found" }), "HTTP 404: not_found");
});

Deno.test("bitFlag: maps booleans to Crisp's 1/0 query convention, passes through undefined", () => {
  assertEquals(bitFlag(true), 1);
  assertEquals(bitFlag(false), 0);
  assertEquals(bitFlag(undefined), undefined);
});

Deno.test("compact: drops undefined and empty-string values only", () => {
  assertEquals(compact({ a: "x", b: undefined, c: "", d: 0, e: false }), {
    a: "x",
    d: 0,
    e: false,
  });
});

Deno.test("csv: splits and trims, empty/blank input is left unset", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});
