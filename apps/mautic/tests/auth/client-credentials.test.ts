import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

Deno.test("client-credentials: sign stamps a Bearer token, network-less", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://mautic.example.com/api/contacts",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok123");
});

Deno.test("client-credentials: fields require the URL, id and secret; only the secrets are masked", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["baseUrl", "clientId", "clientSecret"]);
  assertEquals(
    auth.fields!.filter((f) => f.type === "secret").map((f) => f.key).sort(),
    ["clientId", "clientSecret"],
  );
});

/** Basic Auth and the browser Authorization Code flow are both declined, on purpose. */
Deno.test("client-credentials: the description explains why Basic Auth is declined", () => {
  const doc = auth.description!;
  assert(doc.toLowerCase().includes("no browser sign-in"), doc);
  const fields = auth.fields!.map((f) => f.key);
  assert(!fields.includes("username"), "basic auth must not be offered");
  assert(!fields.includes("password"), "basic auth must not be offered");
});

Deno.test("client-credentials: exchange mints a token via the client_credentials grant", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { access_token: "tok1", expires_in: 3600, token_type: "bearer" } },
  ]);
  const cred = await auth.exchange!(
    { fields: { baseUrl: "mautic.example.com", clientId: "cid", clientSecret: "csecret" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://mautic.example.com/oauth/v2/token");
  assertEquals(calls[0].method, "POST");
  const params = new URLSearchParams(calls[0].body!);
  assertEquals(params.get("grant_type"), "client_credentials");
  assertEquals(params.get("client_id"), "cid");
  assertEquals(params.get("client_secret"), "csecret");
  assertEquals(cred.accessToken, "tok1");
  assertEquals(cred.baseUrl, "https://mautic.example.com");
  assert(typeof cred.expiresAt === "string");
});

Deno.test("client-credentials: exchange requires both the client id and secret", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await auth.exchange!({ fields: { baseUrl: "https://x.com", clientId: "" } }, ctx);
  } catch {
    threw = true;
  }
  assert(threw, "expected exchange() to throw without a client secret");
  assertEquals(calls.length, 0);
});

/** No refresh_token in Mautic's client-credentials response — refresh just re-mints. */
Deno.test("client-credentials: refresh re-runs the client_credentials grant", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { access_token: "tok2", expires_in: 3600, token_type: "bearer" } },
  ]);
  const cred = await auth.refresh!(
    {
      credential: {
        baseUrl: "https://mautic.example.com",
        clientId: "cid",
        clientSecret: "csecret",
        accessToken: "stale",
      },
    },
    ctx,
  ) as Record<string, unknown>;
  const params = new URLSearchParams(calls[0].body!);
  assertEquals(params.get("grant_type"), "client_credentials");
  assertEquals(cred.accessToken, "tok2");
});

Deno.test("client-credentials: test probes /users/self and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, username: "ada" } }]);
  const result = await auth.test(
    { credential: { accessToken: "tok1", baseUrl: "https://mautic.example.com" } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://mautic.example.com/api/users/self");
  assertEquals(calls[0].headers["authorization"], "Bearer tok1");
});

Deno.test("client-credentials: test distinguishes 401 from 403", async () => {
  const unauthorized = mockCtx([{
    status: 401,
    body: { error: { message: "invalid access token", code: 401 } },
  }]);
  const a = await auth.test(
    { credential: { accessToken: "bad", baseUrl: "https://x.com" } },
    unauthorized.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(a.ok, false);
  assert(a.message.includes("401"), a.message);

  const forbidden = mockCtx([{ status: 403, body: {} }]);
  const b = await auth.test(
    { credential: { accessToken: "tok", baseUrl: "https://x.com" } },
    forbidden.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(b.ok, false);
  assert(b.message.includes("permission"), b.message);
});

Deno.test("client-credentials: test fails locally when the credential is incomplete", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test({ credential: { baseUrl: "https://x.com" } }, ctx), {
    ok: false,
    message: "credential missing an access token",
  });
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: afterConnect records the user, never the token", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        id: 1,
        username: "ada",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
    },
  ]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "supersecret", baseUrl: "https://mautic.example.com" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.username, "ada");
  assertEquals(display.email, "ada@example.com");
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

Deno.test("client-credentials: afterConnect never throws when the lookup fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "tok", baseUrl: "https://mautic.example.com" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { baseUrl: "https://mautic.example.com" });
});

Deno.test("client-credentials: declares no revoke — no documented endpoint to call", () => {
  assertEquals(auth.revoke, undefined);
});
