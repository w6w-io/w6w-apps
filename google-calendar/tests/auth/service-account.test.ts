import { assert, assertEquals, assertRejects } from "@std/assert";
import { decodeBase64Url } from "@std/encoding/base64url";
import { mockCtx } from "../_helpers.ts";
import auth, { buildAssertion } from "../../auth/service-account.ts";

Deno.test("service-account: declares the custom-auth fields", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "custom");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assertEquals(keys, ["clientEmail", "privateKey", "impersonate"]);
});

Deno.test("buildAssertion: encodes header and payload as base64url JWT with Calendar scopes", () => {
  const now = 1_700_000_000;
  const { unsigned, header, payload } = buildAssertion(
    {
      clientEmail: "sa@project.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    },
    now,
  );
  assertEquals(unsigned, `${header}.${payload}`);

  const headerJson = JSON.parse(new TextDecoder().decode(decodeBase64Url(header)));
  assertEquals(headerJson, { alg: "RS256", typ: "JWT" });

  const payloadJson = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
  assertEquals(payloadJson.iss, "sa@project.iam.gserviceaccount.com");
  // Without `impersonate` the sub equals the iss.
  assertEquals(payloadJson.sub, "sa@project.iam.gserviceaccount.com");
  assertEquals(payloadJson.aud, "https://oauth2.googleapis.com/token");
  assertEquals(payloadJson.iat, now);
  assertEquals(payloadJson.exp, now + 3600);
  assertEquals(
    payloadJson.scope,
    "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
  );
});

Deno.test("buildAssertion: impersonate sets sub while iss stays the service account", () => {
  const { payload } = buildAssertion({
    clientEmail: "sa@p.iam.gserviceaccount.com",
    privateKey: "k",
    impersonate: "alice@company.com",
  }, 1);
  const payloadJson = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
  assertEquals(payloadJson.iss, "sa@p.iam.gserviceaccount.com");
  assertEquals(payloadJson.sub, "alice@company.com");
});

Deno.test("service-account: exchange posts the JWT assertion to Google's token endpoint", async () => {
  const { ctx, calls } = mockCtx([
    { body: { access_token: "ya29.abc", expires_in: 3600, token_type: "Bearer" } },
  ]);
  const cred = await auth.exchange!(
    {
      fields: {
        clientEmail: "sa@p.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nk\n-----END PRIVATE KEY-----",
      },
    },
    ctx,
  ) as { accessToken: string; clientEmail: string };

  assertEquals(cred.accessToken, "ya29.abc");
  assertEquals(cred.clientEmail, "sa@p.iam.gserviceaccount.com");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://oauth2.googleapis.com/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assert(
    calls[0].body?.startsWith("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer"),
  );
  assert(calls[0].body?.includes("&assertion="));
});

Deno.test("service-account: exchange rejects when required fields are missing", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await auth.exchange!({ fields: {} }, ctx),
    Error,
    "clientEmail",
  );
});

Deno.test("service-account: sign appends Bearer token from the cached credential", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "cached" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer cached");
});

Deno.test("service-account: test issues the same calendarList probe as OAuth", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/calendar/v3/users/me/calendarList");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});
