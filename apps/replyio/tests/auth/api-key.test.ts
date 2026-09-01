import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { WHOAMI_PATH } from "../../lib/client.ts";
import { mockCtx, pathOf, problem } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealApiKey00000";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.reply.io/v3/contacts",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://api.reply.io/v3/contacts");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe is /v3/whoami", () => {
  assertEquals(WHOAMI_PATH, "/whoami");
});

Deno.test("api-key: test passes when whoami answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { userId: 1, username: "acme", teamId: 2 } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v3/whoami");
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The docs claim a 401 has an empty body; this is Reply's actually-observed
 * shape (a JSON problem body), which `test` must prefer when present.
 */
Deno.test("api-key: a 401 with a JSON body reports that body's detail", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: problem(401, "Unauthorized", "Authentication credentials are missing or invalid."),
    },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/missing or invalid/i.test(result.message ?? ""), result.message);
});

/** The documented empty-body 401 shape must still produce a useful message. */
Deno.test("api-key: a 401 with an empty body falls back to the WWW-Authenticate hint", async () => {
  const { ctx } = mockCtx([
    { status: 401, headers: { "www-authenticate": "Bearer" } },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 429 is reported as a rate limit, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 429, body: problem(429, "Too Many Requests", "slow down") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/rate-limited/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported with whatever detail Reply sent", async () => {
  const { ctx } = mockCtx([{ status: 500, body: problem(500, "Internal Server Error", "boom") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/boom/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect publishes username, userId and teamId", async () => {
  const { ctx, calls } = mockCtx([{ body: { userId: 1, username: "acme", teamId: 2 } }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/whoami");
  assertEquals(display, { username: "acme", userId: 1, teamId: 2 });
});

Deno.test("api-key: afterConnect stays silent when whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: problem(401, "Unauthorized", "no") }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: afterConnect stays silent when the response carries no username", async () => {
  const { ctx } = mockCtx([{ body: { userId: 1 } }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(apiKey.type, "bearer");
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
