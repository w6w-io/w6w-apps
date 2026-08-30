import { assert, assertEquals } from "@std/assert";
import {
  ACCEPT_HEADER,
  API_BASE,
  compact,
  encodeId,
  flag,
  formatUnbounceError,
  truncate,
  UnbounceClient,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: constants", () => {
  assertEquals(API_BASE, "https://api.unbounce.com");
  assertEquals(ACCEPT_HEADER, "application/vnd.unbounce.api.v0.4+json");
});

Deno.test("client: get() sends the versioned Accept header and unwraps JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1456243", name: "Acme" } }]);
  const out = await new UnbounceClient(ctx).get("/accounts/1456243");

  assertEquals(pathOf(calls[0].url), "/accounts/1456243");
  assertEquals(calls[0].headers.accept, ACCEPT_HEADER);
  assertEquals(out, { id: "1456243", name: "Acme" });
});

Deno.test("client: get() drops undefined/null/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new UnbounceClient(ctx).get("/pages", {
    sort_order: "asc",
    offset: undefined,
    to: null,
    count: "",
  });
  assertEquals(queryOf(calls[0].url), { sort_order: "asc" });
});

Deno.test("client: post() sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "lead-1" } }]);
  await new UnbounceClient(ctx).post("/pages/p1/leads", { conversion: true });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ conversion: true }));
});

Deno.test("client: delete() returns the status with no body parsing", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const status = await new UnbounceClient(ctx).delete("/pages/p1/leads/l1");

  assertEquals(status, 204);
  assertEquals(calls[0].method, "DELETE");
});

/**
 * The plain-text 401 is the shape actually observed on the wire (measured
 * 2026-08-30), not the JSON error the reference's "Errors" section implies.
 */
Deno.test("client: an error response is thrown with the vendor's message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: "Unauthorized\nRequested URL: https://api.unbounce.com/accounts" },
  ]);
  await assertRejects(() => new UnbounceClient(ctx).get("/accounts"), "Unauthorized");
});

async function assertRejects(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
    throw new Error("expected a rejection");
  } catch (e) {
    assert(String((e as Error).message).includes(includes), (e as Error).message);
  }
}

Deno.test("formatUnbounceError: prefers a JSON message field", () => {
  const msg = formatUnbounceError(
    404,
    "GET",
    "/",
    JSON.stringify({ message: "Not Found", documentation: "https://api.unbounce.com/doc" }),
  );
  assert(msg.includes("Not Found"), msg);
});

Deno.test("formatUnbounceError: falls back to the raw text when the body is not JSON", () => {
  const msg = formatUnbounceError(
    401,
    "GET",
    "/accounts",
    "Unauthorized\nRequested URL: https://api.unbounce.com/accounts",
  );
  assert(msg.includes("Unauthorized"), msg);
  assert(msg.includes("Requested URL"), msg);
});

Deno.test("formatUnbounceError: a 429 names the documented rate limit", () => {
  const msg = formatUnbounceError(429, "GET", "/pages", "{}");
  assert(/500 requests\/minute/.test(msg), msg);
});

Deno.test("compact: drops undefined/null/empty but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("flag: renders true/false as strings, leaves undefined alone", () => {
  assertEquals(flag(true), "true");
  assertEquals(flag(false), "false");
  assertEquals(flag(undefined), undefined);
});

Deno.test("encodeId: escapes path-breaking characters", () => {
  assertEquals(encodeId("abc/def?x=1"), encodeURIComponent("abc/def?x=1"));
});

Deno.test("truncate: leaves short text untouched, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 600);
  assert(out.length < long.length);
  assert(out.includes("700 bytes truncated"), out);
});
