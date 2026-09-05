import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  formatOneSignalError,
  OneSignalClient,
  REDACTED_APP_FIELDS,
  resolveAppId,
  stripAppSecrets,
  toList,
} from "../../lib/client.ts";
import { APP_ID, mockCtx, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("toList: splits a comma string and trims", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("resolveAppId: reads connection.display.appId", () => {
  const { ctx } = mockCtxWithConnection([], APP_ID);
  assertEquals(resolveAppId(ctx.connection), APP_ID);
});

Deno.test("resolveAppId: throws when the connection records no App ID", () => {
  let threw = false;
  try {
    resolveAppId({
      id: "c",
      app: "io.w6w.onesignal",
      auth: "api-key",
      owner: "u",
      state: "connected",
      createdAt: new Date().toISOString(),
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("formatOneSignalError: flat string-array shape", () => {
  const msg = formatOneSignalError(
    429,
    "POST",
    "/notifications",
    JSON.stringify({ errors: ["API rate limit exceeded."] }),
  );
  assertEquals(msg.includes("API rate limit exceeded."), true);
  assertEquals(msg.includes("429"), true);
});

Deno.test("formatOneSignalError: coded {code,title,meta} shape", () => {
  const msg = formatOneSignalError(
    400,
    "POST",
    "/apps/x/segments",
    JSON.stringify({ errors: [{ code: "invalid_filter", title: "Filter is malformed" }] }),
  );
  assertEquals(msg.includes("invalid_filter"), true);
  assertEquals(msg.includes("Filter is malformed"), true);
});

Deno.test("formatOneSignalError: falls back to the raw body when it is not JSON", () => {
  const msg = formatOneSignalError(500, "GET", "/apps/x", "Internal Server Error");
  assertEquals(msg.includes("Internal Server Error"), true);
});

Deno.test("stripAppSecrets: removes every documented credential field", () => {
  const raw: Record<string, unknown> = { id: "app-1", name: "My App" };
  for (const field of REDACTED_APP_FIELDS) raw[field] = "SECRET";
  const clean = stripAppSecrets(raw) as Record<string, unknown>;
  assertEquals(clean.id, "app-1");
  assertEquals(clean.name, "My App");
  for (const field of REDACTED_APP_FIELDS) {
    assertEquals(field in clean, false, `${field} was not stripped`);
  }
});

Deno.test("OneSignalClient.json: parses a JSON body regardless of declared content-type", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: { errors: ["nope"] },
  }]);
  await assertRejects(
    () => new OneSignalClient(ctx).json("/apps/x/segments"),
    Error,
    "nope",
  );
});

Deno.test("OneSignalClient.json: builds the request under the real API root", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { segments: [] } }]);
  await new OneSignalClient(ctx).json("/apps/x/segments", { query: { limit: 1 } });
  assertEquals(pathOf(calls[0].url), "/apps/x/segments");
  assertEquals(calls[0].url.includes("limit=1"), true);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("OneSignalClient.json: sends a JSON body with content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "seg-1", success: true } }]);
  await new OneSignalClient(ctx).json("/apps/x/segments", {
    method: "POST",
    body: { name: "VIPs", filters: [] },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "VIPs", filters: [] }));
});

Deno.test("OneSignalClient.status: returns the HTTP status for a 202 empty body", async () => {
  const { ctx } = mockCtx([{ status: 202 }]);
  const status = await new OneSignalClient(ctx).status("/apps/x/subscriptions/y", {
    method: "DELETE",
  });
  assertEquals(status, 202);
});
