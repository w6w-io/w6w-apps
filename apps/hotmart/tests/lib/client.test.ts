import { assertEquals, assertRejects } from "@std/assert";
import { compact, formatHotmartError, HotmartClient, toList, truncate } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOfMulti } from "../_helpers.ts";

Deno.test("compact - drops undefined/null/empty but keeps false and 0", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" });
  assertEquals(out, { d: false, e: 0, f: "x" });
});

Deno.test("toList - splits comma strings and drops empties", () => {
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("truncate - leaves short text alone, truncates long text with a count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 10);
  assertEquals(out.startsWith("xxxxxxxxxx…"), true);
  assertEquals(out.includes("700 bytes truncated"), true);
});

Deno.test("formatHotmartError - surfaces the vendor's error code and description", () => {
  const msg = formatHotmartError(
    401,
    "GET",
    "/user/api/v1/me",
    JSON.stringify({ error: "invalid_token", error_description: "The Token has expired." }),
  );
  assertEquals(msg.includes("invalid_token"), true);
  assertEquals(msg.includes("The Token has expired."), true);
  assertEquals(msg.includes("401"), true);
});

Deno.test("formatHotmartError - falls back to the raw body when it isn't the documented shape", () => {
  const msg = formatHotmartError(500, "GET", "/x", "<html>oops</html>");
  assertEquals(msg.includes("500"), true);
  assertEquals(msg.includes("<html>oops</html>"), true);
});

Deno.test("formatHotmartError - adds a rate-limit hint on 429", () => {
  const msg = formatHotmartError(429, "GET", "/x", JSON.stringify({ error: "too_many_requests" }));
  assertEquals(msg.includes("500 requests/minute"), true);
});

Deno.test("HotmartClient.json - builds the URL, sends JSON body, parses JSON response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  const client = new HotmartClient(ctx);
  const out = await client.json<{ ok: boolean }>("/payments/api/v1/sales/history", {
    method: "POST",
    query: { a: 1, b: undefined, c: "" },
    body: { x: "y" },
  });
  assertEquals(out, { ok: true });
  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/history");
  assertEquals(queryOfMulti(calls[0].url), { a: ["1"] });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ x: "y" }));
});

Deno.test("HotmartClient.json - repeats array query values as separate keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  const client = new HotmartClient(ctx);
  await client.json("/payments/api/v1/subscriptions", { query: { status: ["ACTIVE", "OVERDUE"] } });
  assertEquals(queryOfMulti(calls[0].url), { status: ["ACTIVE", "OVERDUE"] });
});

Deno.test("HotmartClient.json - throws a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_token", "The Token has expired."),
  }]);
  const client = new HotmartClient(ctx);
  await assertRejects(
    () => client.json("/user/api/v1/me"),
    Error,
    "invalid_token",
  );
});

Deno.test("HotmartClient.json - treats a 204 as an empty result without throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new HotmartClient(ctx);
  const out = await client.json("/payments/api/v1/sales/HP1/refund", { method: "PUT" });
  assertEquals(out, undefined);
});
