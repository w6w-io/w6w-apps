import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { ACCEPT_HEADER } from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "ub_test_fixture_not_a_real_key";

Deno.test("api-key: sign stamps Basic auth with an empty password", () => {
  const request = {
    method: "GET",
    url: "https://api.unbounce.com/accounts",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Basic ${btoa(`${KEY}:`)}`);
  assertEquals(signed.headers.accept, ACCEPT_HEADER);
});

Deno.test("api-key: sign never leaks the raw key into the header value in plain text", () => {
  const request = { method: "GET", url: "x", headers: {} as Record<string, string> };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    headers: Record<string, string>;
  };
  assert(!signed.headers.authorization.includes(KEY), "the key must be base64-encoded, not raw");
});

Deno.test("api-key: test passes when /users/self answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", email: "a@b.com" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/users/self");
  assertEquals(calls[0].headers.authorization, `Basic ${btoa(`${KEY}:`)}`);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/** The auth-failure body is plain text, not JSON — see lib/client.ts. */
Deno.test("api-key: a 401 (plain-text body) is reported as a rejected key", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: "Unauthorized\nRequested URL: https://api.unbounce.com/users/self" },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected this API key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 403 is reported distinctly from a 401", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Forbidden" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/refused/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect publishes only the email and user id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "1460053", email: "corporate.cole@unbounce.com", first_name: "Corporate Cole" } },
  ]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(pathOf(calls[0].url), "/users/self");
  assertEquals(display, { email: "corporate.cole@unbounce.com", userId: "1460053" });
});

Deno.test("api-key: afterConnect stays silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Forbidden" }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});
