import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import clientCredentials from "../../auth/client-credentials.ts";

Deno.test("client-credentials: is a custom type with two required secret fields", () => {
  assertEquals(clientCredentials.type, "custom");
  assertEquals(clientCredentials.fields?.length, 2);
  assert(clientCredentials.fields!.every((f) => f.type === "secret" && f.required === true));
});

Deno.test("client-credentials.exchange: mints a token via the fixed token endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok-1", expires_in: 3600 } }]);
  const cred = await clientCredentials.exchange!(
    { fields: { clientId: "cid", clientSecret: "csecret" } } as never,
    ctx,
  ) as { accessToken: string; clientId: string; expiresAt?: string };
  assertEquals(calls[0].url, "https://app.pipefy.com/oauth/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("grant_type"), "client_credentials");
  assertEquals(body.get("client_id"), "cid");
  assertEquals(body.get("client_secret"), "csecret");
  assertEquals(cred.accessToken, "tok-1");
  assertEquals(cred.clientId, "cid");
  assert(cred.expiresAt);
});

Deno.test("client-credentials.exchange: throws when a field is missing", async () => {
  let threw = false;
  try {
    await clientCredentials.exchange!({ fields: { clientId: "" } } as never, mockCtx([]).ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("client-credentials.exchange: throws with the vendor's error_description on rejection", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_client", error_description: "Client authentication failed" },
  }]);
  let threw = false;
  try {
    await clientCredentials.exchange!(
      { fields: { clientId: "bad", clientSecret: "bad" } } as never,
      ctx,
    );
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("Client authentication failed"));
  }
  assert(threw);
});

Deno.test("client-credentials.refresh: re-mints using the stored client id/secret", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok-2", expires_in: 3600 } }]);
  const cred = await clientCredentials.refresh!(
    { credential: { clientId: "cid", clientSecret: "csecret" } } as never,
    ctx,
  ) as { accessToken: string };
  assertEquals(cred.accessToken, "tok-2");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("client_id"), "cid");
});

Deno.test("client-credentials.sign: stamps Authorization with the minted access token", async () => {
  const { ctx } = mockCtx([]);
  const request = { headers: {} as Record<string, string>, url: "x", method: "POST" };
  const signed = await clientCredentials.sign!(
    { request, credential: { accessToken: "tok-1" } },
    ctx,
  );
  assertEquals(signed.headers["authorization"], "Bearer tok-1");
});

Deno.test("client-credentials.test: succeeds when the minted token is accepted by `me`", async () => {
  const { ctx, calls } = mockCtx([
    { body: { access_token: "tok-1", expires_in: 3600 } },
    { body: { data: { me: { id: "u1" } } } },
  ]);
  const result = await clientCredentials.test!(
    { credential: { clientId: "cid", clientSecret: "csecret" } } as never,
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[1].headers["authorization"], "Bearer tok-1");
});

Deno.test("client-credentials.test: fails without throwing when credential is missing fields", async () => {
  const result = await clientCredentials.test!({ credential: {} } as never, mockCtx([]).ctx);
  assertEquals(result.ok, false);
});

Deno.test("client-credentials.test: a minted-but-unscoped token surfaces the GraphQL rejection", async () => {
  const { ctx } = mockCtx([
    { body: { access_token: "tok-1", expires_in: 3600 } },
    {
      body: {
        errors: [{ title: "Unauthorized", detail: "You are not authorized to access this page" }],
      },
    },
  ]);
  const result = await clientCredentials.test!(
    { credential: { clientId: "cid", clientSecret: "csecret" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message?.includes("Unauthorized"));
});
