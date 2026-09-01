import { assert, assertEquals } from "@std/assert";
import accessKey from "../../auth/access-key.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const KEY = "test_gshuPaZoeEG6ovbc8M79w0QyM";

Deno.test("access-key: sign stamps `AccessKey {key}`, not Bearer or Basic", () => {
  const request = {
    method: "GET",
    url: "https://rest.messagebird.com/messages",
    headers: {} as Record<string, string>,
  };
  const signed = accessKey.sign!({ request, credential: { accessKey: KEY } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `AccessKey ${KEY}`);
});

Deno.test("access-key: test probes GET /balance, signed", async () => {
  const { ctx, calls } = mockCtx([{ body: { payment: "prepaid", type: "euros", amount: 103 } }]);
  const result = await accessKey.test({ credential: { accessKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://rest.messagebird.com/balance");
  assertEquals(calls[0].headers.authorization, `AccessKey ${KEY}`);
});

/**
 * `/balance` returns the account's OWN balance, never the caller's access
 * key — the probe must never be swapped for an endpoint that echoes the
 * credential back (e.g. a key-listing endpoint).
 */
Deno.test("access-key: the probe response never contains the credential", async () => {
  const { ctx } = mockCtx([{ body: { payment: "prepaid", type: "euros", amount: 103 } }]);
  const result = await accessKey.test({ credential: { accessKey: KEY } }, ctx);
  assert(!JSON.stringify(result).includes(KEY));
});

/**
 * A bad key can still answer 200 on some gateways, and a good key's request
 * can 5xx transiently — the classification must come from the BODY shape,
 * never the HTTP status alone.
 */
Deno.test("access-key: classifies success from the balance object's shape, not the status", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { payment: "prepaid", type: "euros", amount: 0 },
  }]);
  const result = await accessKey.test({ credential: { accessKey: KEY } }, ctx);
  assertEquals(result.ok, true);
});

Deno.test("access-key: a rejected key is classified from the errors body, not the status code", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody([{ code: 2, description: "Request not allowed (incorrect access_key)" }]),
    },
  ]);
  const result = await accessKey.test({ credential: { accessKey: "bad" } }, ctx);

  assertEquals(result.ok, false);
  assert(/incorrect access_key/.test(result.message ?? ""), result.message);
});

Deno.test("access-key: an unparseable / unexpected body is reported, never treated as ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>not json</html>" }]);
  const result = await accessKey.test({ credential: { accessKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/Unexpected response/.test(result.message ?? ""), result.message);
});

Deno.test("access-key: the credential field is a secret", () => {
  assertEquals(accessKey.fields?.[0].key, "accessKey");
  assertEquals(accessKey.fields?.[0].type, "secret");
});
