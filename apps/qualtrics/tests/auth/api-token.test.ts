import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, normalizeDatacenterId, PROBE_PATH } from "../../auth/api-token.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "unit-test-fixture-not-a-real-qualtrics-token";

Deno.test("api-token: sign stamps X-API-TOKEN and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://iad1.qualtrics.com/API/v3/surveys",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!(
    { request, credential: { apiToken: TOKEN, datacenterId: "iad1" } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers["x-api-token"], TOKEN);
  assertEquals(signed.url, "https://iad1.qualtrics.com/API/v3/surveys");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-token: declares the apiKey header the wire actually uses", () => {
  assertEquals(apiToken.type, "apiKey");
  assertEquals(apiToken.apiKey, { in: "header", name: "X-API-TOKEN" });
  assertEquals(authHeaders({ apiToken: TOKEN }), { "x-api-token": TOKEN });
});

/** `whoami` returns the caller's own profile and never the API token itself. */
Deno.test("api-token: the probe is the non-leaking /whoami", () => {
  assertEquals(PROBE_PATH, "/whoami");
});

Deno.test("api-token: normalises a pasted datacenter URL down to the id", () => {
  assertEquals(normalizeDatacenterId("iad1"), "iad1");
  assertEquals(normalizeDatacenterId(" IAD1 "), "iad1");
  assertEquals(normalizeDatacenterId("https://fra1.qualtrics.com/API/v3"), "fra1");
  assertEquals(normalizeDatacenterId("syd1.qualtrics.com"), "syd1");
});

Deno.test("api-token: test passes when whoami answers", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ userName: "someone", email: "a@b.example" }) },
  ]);
  const result = await apiToken.test(
    { credential: { datacenterId: "iad1", apiToken: TOKEN } },
    ctx,
  );

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/API/v3/whoami");
  assertEquals(calls[0].headers["x-api-token"], TOKEN);
});

Deno.test("api-token: test fails with no datacenter or token, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiToken.test({ credential: {} }, ctx)).ok, false);
  assertEquals((await apiToken.test({ credential: { datacenterId: "iad1" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Two statuses, two problems: Qualtrics answers 400 for a credential that never
 * arrived and 401 for one it does not recognize. Collapsing them would tell a
 * user to rotate a token that was simply not attached.
 */
Deno.test("api-token: a 400 ATP_2 is reported as a token that never arrived", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: errorBody(
        "ATP_2",
        "Expected authorization in headers, but none provided.",
        "400 - Bad Request",
      ),
    },
  ]);
  const result = await apiToken.test(
    { credential: { datacenterId: "iad1", apiToken: TOKEN } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/received no API token/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 401 DCD_7 is reported as a rejected token, with the code", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("DCD_7", "Unrecognized X-API-TOKEN.") },
  ]);
  const result = await apiToken.test(
    { credential: { datacenterId: "iad1", apiToken: "garbage" } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/rejected the API token/i.test(result.message ?? ""), result.message);
  assert(/DCD_7/.test(result.message ?? ""), result.message);
  assert(!/garbage/.test(result.message ?? ""), "the message must not echo the token");
});

Deno.test("api-token: an unrecognized 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiToken.test(
    { credential: { datacenterId: "iad1", apiToken: TOKEN } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: an unreachable datacenter is named, not thrown", async () => {
  const { ctx } = mockCtx([]);
  const result = await apiToken.test(
    { credential: { datacenterId: "nope1", apiToken: TOKEN } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/nope1\.qualtrics\.com/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: afterConnect records the datacenter id and nothing secret", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ userName: "ops@acme.example", email: "ops@acme.example" }) },
  ]);
  const display = await apiToken.afterConnect!(
    { credential: { datacenterId: "https://fra1.qualtrics.com/API/v3", apiToken: TOKEN } },
    ctx,
  );

  assertEquals(calls[0].url, "https://fra1.qualtrics.com/API/v3/whoami");
  assertEquals(display, { datacenterId: "fra1", userName: "ops@acme.example" });
  assert(!JSON.stringify(display).includes(TOKEN), "the token must not reach display data");
});

Deno.test("api-token: afterConnect still records the datacenter when whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("DCD_7", "Unrecognized X-API-TOKEN.") }]);
  const display = await apiToken.afterConnect!(
    { credential: { datacenterId: "iad1", apiToken: TOKEN } },
    ctx,
  );

  assertEquals(display, { datacenterId: "iad1" });
});
