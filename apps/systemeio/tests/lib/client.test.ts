import { assert, assertEquals, assertRejects } from "@std/assert";
import { compact, formatSystemeError, SystemeClient, truncate } from "../../lib/client.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 600);
  assert(out.length < long.length);
  assert(out.includes("700 bytes truncated"));
});

Deno.test("formatSystemeError: prefers detail over title", () => {
  const msg = formatSystemeError(
    401,
    "GET",
    "/api/contacts",
    JSON.stringify(problemBody("Invalid API Key.")),
  );
  assert(msg.includes("Invalid API Key."));
  assert(msg.includes("401"));
});

Deno.test("formatSystemeError: falls back to the raw body when it isn't JSON", () => {
  const msg = formatSystemeError(500, "GET", "/api/contacts", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

Deno.test("formatSystemeError: a 429 adds the rate-limit hint", () => {
  const msg = formatSystemeError(
    429,
    "GET",
    "/api/contacts",
    JSON.stringify(problemBody("Too many requests")),
  );
  assert(/retry after the Retry-After header/i.test(msg));
});

Deno.test("SystemeClient.get: builds the query string, drops empty values", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], hasMore: false } }]);
  await new SystemeClient(ctx).get("/api/tags", { query: "x", limit: 10, startingAfter: "" });

  assertEquals(pathOf(calls[0].url), "/api/tags");
  assertEquals(queryOf(calls[0].url), { query: "x", limit: "10" });
  assertEquals(calls[0].method, "GET");
});

Deno.test("SystemeClient.post: sends application/json", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, name: "vip" } }]);
  await new SystemeClient(ctx).post("/api/tags", { name: "vip" });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "vip" }));
});

Deno.test("SystemeClient.patch: sends application/merge-patch+json, not application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new SystemeClient(ctx).patch("/api/contacts/1", { locale: "en" });

  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["content-type"], "application/merge-patch+json");
});

Deno.test("SystemeClient.put: sends application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "vip" } }]);
  await new SystemeClient(ctx).put("/api/tags/1", { name: "vip" });

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("SystemeClient.status: reports the HTTP status for a 204 delete with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const status = await new SystemeClient(ctx).status("/api/tags/1");

  assertEquals(status, 204);
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("SystemeClient: a non-ok response throws with the vendor's detail", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { detail: "Resource not found." } }]);
  await assertRejects(
    () => new SystemeClient(ctx).get("/api/tags/999"),
    Error,
    "Resource not found.",
  );
});
