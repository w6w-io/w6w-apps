import { assert, assertEquals } from "@std/assert";
import accessToken from "../../auth/access-token.ts";
import { ACCESS_TOKEN, HOMESERVER, matrixError, mockCtx } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, credential: Record<string, unknown>): SignableRequest {
  const { ctx } = mockCtx([]);
  return accessToken.sign!({ request, credential } as never, ctx) as SignableRequest;
}

Deno.test("auth: declares a bearer scheme carrying the homeserver URL and the token", () => {
  assertEquals(accessToken.key, "access-token");
  assertEquals(accessToken.type, "bearer");
  const fields = accessToken.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["homeserverUrl", "accessToken"]);
  assertEquals(fields.find((f) => f.key === "accessToken")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "homeserverUrl")?.type, "string");
});

Deno.test("sign: stamps the bearer header and leaves the URL alone", () => {
  const request = {
    url: `${HOMESERVER}/_matrix/client/v3/joined_rooms`,
    headers: {} as Record<string, string>,
  };
  const signed = signWith(request, { homeserverUrl: HOMESERVER, accessToken: ACCESS_TOKEN });
  assertEquals(signed.headers["authorization"], `Bearer ${ACCESS_TOKEN}`);
  assertEquals(signed.url, `${HOMESERVER}/_matrix/client/v3/joined_rooms`);
});

Deno.test("test: probes account/whoami on the homeserver the credential names", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_id: "@alice:example.org", device_id: "D1" } }]);
  const result = await accessToken.test!(
    { credential: { homeserverUrl: HOMESERVER, accessToken: ACCESS_TOKEN } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/account/whoami`);
  assertEquals(calls[0].headers["authorization"], `Bearer ${ACCESS_TOKEN}`);
});

Deno.test("test: reports a missing half of the credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    (await accessToken.test!({ credential: { accessToken: ACCESS_TOKEN } } as never, ctx)).ok,
    false,
  );
  assertEquals(
    (await accessToken.test!({ credential: { homeserverUrl: HOMESERVER } } as never, ctx)).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

Deno.test("test: a dead token is diagnosed from the errcode, not the status alone", async () => {
  const { ctx } = mockCtx([{ status: 401, body: matrixError("M_UNKNOWN_TOKEN", "expired") }]);
  const result = await accessToken.test!(
    { credential: { homeserverUrl: HOMESERVER, accessToken: ACCESS_TOKEN } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  const message = result.message ?? "";
  assert(message.includes("M_UNKNOWN_TOKEN"), message);
});

Deno.test("afterConnect: records the homeserver and user id, never the token", async () => {
  const { ctx } = mockCtx([{ body: { user_id: "@alice:example.org", device_id: "D1" } }]);
  const display = await accessToken.afterConnect!(
    { credential: { homeserverUrl: HOMESERVER, accessToken: ACCESS_TOKEN } } as never,
    ctx,
  );
  assertEquals(display, {
    homeserverUrl: HOMESERVER,
    userId: "@alice:example.org",
    deviceId: "D1",
  });
  assert(!JSON.stringify(display).includes(ACCESS_TOKEN));
});
