import { assert, assertEquals } from "@std/assert";
import basic, { authHeader } from "../../auth/basic.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const CRED = { username: "charles.conway", apiKey: "unit-test-fixture-not-a-real-key" };

Deno.test("basic: authHeader is the single source of the wire format", () => {
  assertEquals(authHeader(CRED), `Basic ${btoa(`${CRED.username}:${CRED.apiKey}`)}`);
});

Deno.test("basic: sign stamps the Authorization header and nothing else", () => {
  const request = { method: "GET", url: "https://rest.textmagic.com/api/v2/messages", headers: {} };
  const signed = basic.sign!({ request, credential: CRED }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, authHeader(CRED));
  assertEquals(signed.url, "https://rest.textmagic.com/api/v2/messages");
  assert(!signed.url.includes(CRED.apiKey));
});

Deno.test("basic: test fails with no username or apiKey, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await basic.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: test calls GET /ping, signed, and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { userId: 123, ping: "pong", utcDateTime: "now" } }]);
  const result = await basic.test({ credential: CRED }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v2/ping");
  assertEquals(calls[0].headers.authorization, authHeader(CRED));
});

Deno.test("basic: test surfaces TextMagic's own message on a wrong credential", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(401, "Invalid credentials or this token has been revoked.") },
  ]);
  const result = await basic.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/Invalid credentials or this token has been revoked/.test(result.message ?? ""));
});

/**
 * The ping response carries no secret and no account material worth scrubbing
 * — pinned here because it is the exact reason `/ping` was chosen over
 * `/user` as the probe.
 */
Deno.test("basic: the probe response is never echoed into the test result", async () => {
  const { ctx } = mockCtx([{ body: { userId: 123, ping: "pong", utcDateTime: "now" } }]);
  const result = await basic.test({ credential: CRED }, ctx);
  assertEquals(Object.keys(result), ["ok"]);
});
