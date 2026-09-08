import { assert, assertEquals, assertRejects } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import clientCredentials from "../../auth/client-credentials.ts";
import { mockCtx, odataList, pathOf } from "../_helpers.ts";

Deno.test("exchange: mints a token via form-urlencoded POST to the identity host", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      access_token: "tok-123",
      expires_in: 2147483647,
      token_type: "Bearer",
      scope: "api1",
      organizationId: "org-1",
      personId: "person-1",
    },
  }]);

  const cred = await clientCredentials.exchange!(
    { fields: { clientId: "cid", clientSecret: "csecret" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/connect/token");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "grant_type=client_credentials&client_id=cid&client_secret=csecret");
  assertEquals(cred.accessToken, "tok-123");
  assert(typeof cred.expiresAt === "string");
});

Deno.test("exchange: requires both clientId and clientSecret", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(clientCredentials.exchange!({ fields: { clientId: "cid" } }, ctx)),
    Error,
    "required",
  );
});

Deno.test("exchange: surfaces the vendor's error_description on a rejected grant", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "invalid_client", error_description: "invalid client credentials" },
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        clientCredentials.exchange!({ fields: { clientId: "bad", clientSecret: "bad" } }, ctx),
      ),
    Error,
    "invalid client credentials",
  );
});

Deno.test("refresh: re-mints from the stored clientId/clientSecret", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok-456", expires_in: 3600 } }]);
  const cred = await clientCredentials.refresh!(
    { credential: { clientId: "cid", clientSecret: "csecret", accessToken: "old" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/connect/token");
  assertEquals(cred.accessToken, "tok-456");
  assertEquals(cred.clientId, "cid");
});

Deno.test("refresh: refuses without a stored clientId/clientSecret", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(clientCredentials.refresh!({ credential: { accessToken: "old" } }, ctx)),
    Error,
    "Reconnect",
  );
});

Deno.test("sign: stamps a bearer authorization header and never touches the network", () => {
  const request: SignableRequest = {
    url: "https://workspace.prod.jibble.io/v1/Organizations",
    method: "GET",
    headers: {},
  };
  const signed = clientCredentials.sign!(
    { request, credential: { accessToken: "tok-123" } },
    {
      fetch: () => {
        throw new Error("sign must not call fetch");
      },
      log: () => {},
    } as unknown as Parameters<NonNullable<typeof clientCredentials.sign>>[1],
  );
  assertEquals((signed as SignableRequest).headers["authorization"], "Bearer tok-123");
});

Deno.test("test: reports ok and names the organization on a live token", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "org-1", name: "Acme Co" }]) }]);
  const result = await clientCredentials.test(
    { credential: { accessToken: "tok-123" } },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/Organizations");
  assertEquals(result.ok, true);
  assert(result.message?.includes("Acme Co"));
});

Deno.test("test: reports not-ok on a rejected token, without ever calling sign", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "unauthorized", message: "bad token" } },
  }]);
  const result = await clientCredentials.test({ credential: { accessToken: "expired" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("unauthorized"));
});

Deno.test("test: fails closed when the credential carries no accessToken", async () => {
  const { ctx } = mockCtx([]);
  const result = await clientCredentials.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});
