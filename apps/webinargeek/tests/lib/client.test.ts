import { assert, assertEquals, assertRejects } from "@std/assert";
import { API_URL, formatWebinarGeekError, WebinarGeekClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: builds the URL against app.webinargeek.com/api/v2 and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new WebinarGeekClient(ctx).request("/webinars", {
    query: { language: "en", user_id: undefined, series_only: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.webinargeek.com");
  assertEquals(url.pathname, "/api/v2/webinars");
  assertEquals(url.searchParams.get("language"), "en");
  assertEquals(url.searchParams.has("user_id"), false);
  assertEquals(url.searchParams.has("series_only"), false);
});

Deno.test("client: never sets an Api-Token header itself — sign is the auth hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new WebinarGeekClient(ctx).request("/account");
  assertEquals("api-token" in calls[0].headers, false);
});

Deno.test("client: throws a message carrying the vendor's own code and message", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: { code: "not_found", message: "The user could not be found." } },
  ]);
  await assertRejects(
    () => new WebinarGeekClient(ctx).request("/subscriptions/999"),
    Error,
    "not_found",
  );
});

Deno.test("formatWebinarGeekError: falls back to the raw body when it is not the documented shape", () => {
  const message = formatWebinarGeekError(500, "GET", "/webinars", "<html>Internal Error</html>");
  assert(message.includes("500"));
  assert(message.includes("<html>"));
});

Deno.test("formatWebinarGeekError: reads code and message from the documented error envelope", () => {
  const raw = JSON.stringify({ code: "conflict_error", message: "already subscribed" });
  const message = formatWebinarGeekError(409, "POST", "/broadcasts/1/subscriptions", raw);
  assert(message.includes("conflict_error"));
  assert(message.includes("already subscribed"));
});

Deno.test("client: API_URL is the vendor's own documented base URL", () => {
  assertEquals(API_URL, "https://app.webinargeek.com/api/v2");
});
