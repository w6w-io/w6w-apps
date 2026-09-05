import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

Deno.test("client-credentials: sign stamps both Authorization and Lw-Client, network-less", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://yourschool.learnworlds.com/admin/api/v2/courses",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accessToken: "tok123", clientId: "cid1" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer tok123");
  assertEquals(out.headers["lw-client"], "cid1");
});

Deno.test("client-credentials: fields require the domain, id and secret; only the secrets are masked", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["clientId", "clientSecret", "schoolDomain"]);
  assertEquals(
    auth.fields!.filter((f) => f.type === "secret").map((f) => f.key).sort(),
    ["clientId", "clientSecret"],
  );
});

Deno.test("client-credentials: exchange mints a token via the client_credentials grant, with Lw-Client set", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { tokenData: { access_token: "tok1", expires_in: 8000 }, success: true, errors: [] },
    },
  ]);
  const cred = await auth.exchange!(
    {
      fields: {
        schoolDomain: "yourschool.learnworlds.com",
        clientId: "cid",
        clientSecret: "csecret",
      },
    },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/oauth2/access_token",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["lw-client"], "cid");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.grant_type, "client_credentials");
  assertEquals(body.client_id, "cid");
  assertEquals(body.client_secret, "csecret");
  assertEquals(cred.accessToken, "tok1");
  assertEquals(cred.schoolDomain, "https://yourschool.learnworlds.com");
  assert(typeof cred.expiresAt === "string");
});

Deno.test("client-credentials: exchange requires both the client id and secret", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await auth.exchange!({ fields: { schoolDomain: "https://x.com", clientId: "" } }, ctx);
  } catch {
    threw = true;
  }
  assert(threw, "expected exchange() to throw without a client secret");
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: exchange throws on the documented error envelope", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: {
        errors: [{
          code: 400,
          context: "client_id",
          message: "Missing client_id or client cannot be found.",
        }],
        success: false,
      },
    },
  ]);
  let threw = false;
  try {
    await auth.exchange!(
      { fields: { schoolDomain: "https://x.com", clientId: "cid", clientSecret: "bad" } },
      ctx,
    );
  } catch (err) {
    threw = true;
    assert((err as Error).message.includes("Missing client_id"), (err as Error).message);
  }
  assert(threw, "expected exchange() to throw on a failure envelope");
});

/** No refresh_token in LearnWorlds' client-credentials response — refresh just re-mints. */
Deno.test("client-credentials: refresh re-runs the client_credentials grant", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { tokenData: { access_token: "tok2", expires_in: 8000 }, success: true } },
  ]);
  const cred = await auth.refresh!(
    {
      credential: {
        schoolDomain: "https://yourschool.learnworlds.com",
        clientId: "cid",
        clientSecret: "csecret",
        accessToken: "stale",
      },
    },
    ctx,
  ) as Record<string, unknown>;
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.grant_type, "client_credentials");
  assertEquals(cred.accessToken, "tok2");
});

Deno.test("client-credentials: test probes /v2/users?items_per_page=1 with both headers set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: {} } }]);
  const result = await auth.test(
    {
      credential: {
        accessToken: "tok1",
        schoolDomain: "https://yourschool.learnworlds.com",
        clientId: "cid",
      },
    },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(
    calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/v2/users?items_per_page=1",
  );
  assertEquals(calls[0].headers["authorization"], "Bearer tok1");
  assertEquals(calls[0].headers["lw-client"], "cid");
});

Deno.test("client-credentials: test distinguishes 401 from 403", async () => {
  const unauthorized = mockCtx([{
    status: 401,
    body: { errors: [{ code: 401, message: "Invalid object ID" }], success: false },
  }]);
  const a = await auth.test(
    {
      credential: {
        accessToken: "bad",
        schoolDomain: "https://x.com",
        clientId: "cid",
      },
    },
    unauthorized.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(a.ok, false);
  assert(a.message.includes("401"), a.message);

  const forbidden = mockCtx([{ status: 403, body: {} }]);
  const b = await auth.test(
    { credential: { accessToken: "tok", schoolDomain: "https://x.com", clientId: "cid" } },
    forbidden.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(b.ok, false);
  assert(b.message.includes("plan"), b.message);
});

Deno.test("client-credentials: test fails locally when the credential is incomplete", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    await auth.test({ credential: { schoolDomain: "https://x.com", clientId: "cid" } }, ctx),
    { ok: false, message: "credential missing an access token" },
  );
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: afterConnect records the school domain, never the token", async () => {
  const display = await auth.afterConnect!(
    {
      credential: {
        accessToken: "supersecret",
        schoolDomain: "https://yourschool.learnworlds.com",
        clientId: "cid",
        clientSecret: "topsecret",
      },
    },
    mockCtx().ctx,
  ) as Record<string, unknown>;
  assertEquals(display.schoolDomain, "https://yourschool.learnworlds.com");
  assert(!JSON.stringify(display).includes("supersecret"), "the token leaked into display");
  assert(!JSON.stringify(display).includes("topsecret"), "the client secret leaked into display");
});

Deno.test("client-credentials: declares no revoke — no documented endpoint to call", () => {
  assertEquals(auth.revoke, undefined);
});
