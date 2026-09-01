import { assert, assertEquals } from "@std/assert";
import basic, { authHeader, PROBE_PATH } from "../../auth/basic.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY_ID = "rzp_test_unitTestFixtureKeyId0";
const KEY_SECRET = "unitTestFixtureSecretNotReal00";

Deno.test("basic: sign stamps the Basic header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.razorpay.com/v1/payments",
    headers: {} as Record<string, string>,
  };
  const signed = basic.sign!(
    { request, credential: { keyId: KEY_ID, keySecret: KEY_SECRET } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers.authorization, `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`);
  assertEquals(signed.url, "https://api.razorpay.com/v1/payments");
  assert(!signed.url.includes(KEY_SECRET));
});

Deno.test("basic: authHeader is the single source of the wire format", () => {
  assertEquals(
    authHeader({ keyId: KEY_ID, keySecret: KEY_SECRET }),
    `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`,
  );
});

Deno.test("basic: the probe is /payments — there is no dedicated ping/whoami", () => {
  assertEquals(PROBE_PATH, "/payments");
});

Deno.test("basic: test passes when the probe answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { entity: "collection", count: 0, items: [] } }]);
  const result = await basic.test({ credential: { keyId: KEY_ID, keySecret: KEY_SECRET } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/payments");
  assertEquals(queryOf(calls[0].url), { count: "1" });
  assertEquals(calls[0].headers.authorization, `Basic ${btoa(`${KEY_ID}:${KEY_SECRET}`)}`);
});

Deno.test("basic: test fails with no credential, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await basic.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The whole point of `auth/basic.ts`'s design: `code` is identically
 * `BAD_REQUEST_ERROR` for both failures below, so only the message text
 * distinguishes "never reached the request" from "wrong credential".
 */
Deno.test("basic: a missing-credential response is reported as never having arrived", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        "BAD_REQUEST_ERROR",
        "Please provide your api key for authentication purposes",
      ),
    },
  ]);
  const result = await basic.test({ credential: { keyId: KEY_ID, keySecret: KEY_SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no credential/i.test(result.message ?? ""), result.message);
});

Deno.test("basic: a wrong-credential response is reported as rejected, same code as above", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("BAD_REQUEST_ERROR", "Authentication failed") },
  ]);
  const result = await basic.test({ credential: { keyId: KEY_ID, keySecret: "wrong" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the key id and secret/i.test(result.message ?? ""), result.message);
});

Deno.test("basic: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await basic.test({ credential: { keyId: KEY_ID, keySecret: KEY_SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("basic: afterConnect labels the connection from the key id prefix, no network call", () => {
  assertEquals(basic.afterConnect!({ credential: { keyId: "rzp_test_abc" } }, {} as never), {
    mode: "Test",
  });
  assertEquals(basic.afterConnect!({ credential: { keyId: "rzp_live_abc" } }, {} as never), {
    mode: "Live",
  });
  assertEquals(basic.afterConnect!({ credential: { keyId: "garbage" } }, {} as never), {
    mode: "unknown mode",
  });
});

Deno.test("basic: the credential fields are declared secret/string, not silently plain", () => {
  const secretField = basic.fields?.find((f) => f.key === "keySecret");
  assertEquals(secretField?.type, "secret");
});
