import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Google authorize/token endpoints and Calendar scopes", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.scopes, [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ]);
  // Google's OAuth server requires these for a refresh_token to come back.
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test hits /users/me/calendarList to prove the calendar scope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/calendar/v3/users/me/calendarList");
  assertEquals(url.searchParams.get("maxResults"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("oauth2: afterConnect extracts identity from the primary calendar", async () => {
  const { ctx } = mockCtx([
    { body: { id: "user@example.com", summary: "Sam", timeZone: "Europe/Berlin" } },
  ]);
  const result = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(result.user, { id: "user@example.com", name: "Sam", email: "user@example.com" });
  assertEquals(result.timeZone, "Europe/Berlin");
});
