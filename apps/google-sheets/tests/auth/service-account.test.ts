import { assert, assertEquals } from "@std/assert";
import { encodeBase64 } from "@std/encoding/base64";
import { mockCtx } from "../_helpers.ts";
import auth, { exchangeForAccessToken } from "../../auth/service-account.ts";

Deno.test("service-account: is a custom method with email + private key fields", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "custom");
  const fields = auth.fields ?? [];
  assertEquals(fields.find((f) => f.key === "email")?.required, true);
  const pk = fields.find((f) => f.key === "privateKey");
  assertEquals(pk?.required, true);
  assertEquals(pk?.type, "secret");
});

Deno.test("service-account: test with missing credential parts reports the failure", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { email: "x@y.z" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("privateKey"));
  assertEquals(calls.length, 0);
});

// Generate an RSA keypair at test-time so `exchangeForAccessToken` exercises the
// real JWT signing path end-to-end (mocking crypto.subtle would be misleading).
async function generatePemPrivateKey(): Promise<string> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const b64 = encodeBase64(new Uint8Array(pkcs8));
  const wrapped = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
}

Deno.test("service-account: exchange builds a JWT assertion and forwards Google's access token", async () => {
  const pem = await generatePemPrivateKey();
  const { ctx, calls } = mockCtx([
    { status: 200, body: { access_token: "acc-xyz", expires_in: 3600 } },
  ]);

  const token = await exchangeForAccessToken(
    { email: "sa@proj.iam.gserviceaccount.com", privateKey: pem },
    ctx.fetch,
  );
  assertEquals(token, "acc-xyz");
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).href, "https://oauth2.googleapis.com/token");
  assertEquals(
    calls[0].headers["content-type"],
    "application/x-www-form-urlencoded",
  );

  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
  const assertion = body.get("assertion");
  assert(assertion, "assertion is present");
  const parts = assertion!.split(".");
  assertEquals(parts.length, 3);

  // Decode base64url header/claims and confirm we set the Google-required fields.
  const decode = (s: string) =>
    JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
      ),
    );
  assertEquals(decode(parts[0]).alg, "RS256");
  const claims = decode(parts[1]);
  assertEquals(claims.iss, "sa@proj.iam.gserviceaccount.com");
  assertEquals(claims.aud, "https://oauth2.googleapis.com/token");
  assert(claims.scope.includes("spreadsheets"));
});

Deno.test("service-account: sign injects the exchanged Bearer on the request", async () => {
  const pem = await generatePemPrivateKey();
  const { ctx } = mockCtx([
    { status: 200, body: { access_token: "acc-bearer" } },
  ]);
  const request = {
    url: "https://sheets.googleapis.com/v4/spreadsheets/x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({
    request,
    credential: { email: "sa@x.iam.gserviceaccount.com", privateKey: pem },
  }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-bearer");
});
