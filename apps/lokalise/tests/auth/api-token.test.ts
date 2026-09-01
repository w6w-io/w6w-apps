import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "f4d3f29bf893dc3583e9970735e08de094e82b0";

Deno.test("api-token: sign stamps the X-Api-Token header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.lokalise.com/api2/projects",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["x-api-token"], TOKEN);
  // Lokalise documents no query-string alternative; the URL must stay clean.
  assertEquals(signed.url, "https://api.lokalise.com/api2/projects");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { "x-api-token": TOKEN });
});

Deno.test("api-token: the probe is /projects", () => {
  assertEquals(PROBE_PATH, "/projects");
});

Deno.test("api-token: test passes when List Projects answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { projects: [] } }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api2/projects");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["x-api-token"], TOKEN);
});

Deno.test("api-token: an account with zero projects is still ok", async () => {
  const { ctx } = mockCtx([{ body: { projects: [] } }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, true);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The documented-vs-observed gap: a missing/malformed token is a 400, not the
 * documented 401. Both must be reported as a bad credential, distinguished in
 * the message.
 */
Deno.test("api-token: a malformed/missing token (400) is reported distinctly from a wrong one (401)", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: errorBody("Invalid `X-Api-Token` header", 400) },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "x" } }, ctx);

  assertEquals(result.ok, false);
  assert(/never reached Lokalise/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a well-formed but wrong token (401) is reported as rejected", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized", 401) }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
  assert(/401/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 403 is reported as a refusal, not as a bad token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden", 403) }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/refused/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

/**
 * `afterConnect` is the one place this app names the token's team, so a
 * Connection list does not read as a wall of identical "Lokalise" labels.
 */
Deno.test("api-token: afterConnect publishes only the first team's name", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        teams: [
          {
            team_id: 1,
            name: "Acme Localization",
            plan: "Essential",
            quota_usage: { keys: 100 },
            quota_allowed: { keys: 10000 },
          },
        ],
      },
    },
  ]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/api2/teams");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(display, { teamName: "Acme Localization" });
  assert(!JSON.stringify(display).includes("Essential"));
});

Deno.test("api-token: afterConnect stays silent when the request fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden", 403) }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});

Deno.test("api-token: afterConnect stays silent when there are no teams", async () => {
  const { ctx } = mockCtx([{ body: { teams: [] } }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});
