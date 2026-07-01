import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares an apiKey-type auth with a required secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign injects HTTP Basic with the key as password", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://us14.api.mailchimp.com/3.0/lists",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { apiKey: "abcdef-us14" } },
    ctx,
  );
  const encoded = btoa("anystring:abcdef-us14");
  assertEquals(out.headers["authorization"], `Basic ${encoded}`);
});

Deno.test("api-key: test hits the account's datacenter /ping and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { health_status: "Ok" } }]);
  const result = await auth.test({ credential: { apiKey: "abcdef-us14" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://us14.api.mailchimp.com");
  assertEquals(url.pathname, "/3.0/ping");
  assert(calls[0].headers["authorization"]?.startsWith("Basic "));
});

Deno.test("api-key: test with missing credential reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("apiKey"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test with malformed key (no datacenter) reports the failure", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { apiKey: "no-datacenter-" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").toLowerCase().includes("datacenter"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test surfaces the upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "bad-us14" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: afterConnect returns the datacenter and account fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      account_name: "Acme",
      email: "ops@acme.example",
      login_id: "u-42",
    },
  }]);
  const result = await auth.afterConnect!(
    { credential: { apiKey: "abcdef-us14" } },
    ctx,
  );
  assertEquals(result.datacenter, "us14");
  const account = result.account as Record<string, unknown>;
  assertEquals(account.name, "Acme");
  assertEquals(account.email, "ops@acme.example");
  assertEquals(account.id, "u-42");
  assertEquals(new URL(calls[0].url).origin, "https://us14.api.mailchimp.com");
});

Deno.test("api-key: afterConnect still returns the datacenter when the account lookup fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await auth.afterConnect!(
    { credential: { apiKey: "abcdef-us14" } },
    ctx,
  );
  assertEquals(result.datacenter, "us14");
});
