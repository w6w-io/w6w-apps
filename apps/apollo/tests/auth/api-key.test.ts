import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

Deno.test("authHeaders: builds the x-api-key header, empty string when absent", () => {
  assertEquals(authHeaders({ apiKey: "secret123" }), { "x-api-key": "secret123" });
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("sign: stamps x-api-key on the request and returns it, touching nothing else", async () => {
  const request = {
    url: "https://api.apollo.io/api/v1/contacts",
    headers: {} as Record<string, string>,
  };
  const out = await apiKey.sign!(
    { request, credential: { apiKey: "secret123" } } as never,
    {} as HookContext,
  );
  assertEquals(out.headers["x-api-key"], "secret123");
  assertEquals(out.url, "https://api.apollo.io/api/v1/contacts");
});

Deno.test("test: an empty credential fails locally, with no network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { apiKey: "" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: probes GET /users/api_profile, not the undocumented auth/health", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.com" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/api/v1${PROBE_PATH}`);
  assertEquals(calls[0].headers["x-api-key"], "k");
});

Deno.test("test: a 422 (no key reached the request) reports the credential-not-attached message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { error: "Api key required" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(/did not reach the request/.test(result.message ?? ""), result.message);
});

Deno.test("test: a 401 JSON error surfaces Apollo's own message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error: "Invalid API key." } },
  ]);
  const result = await apiKey.test!({ credential: { apiKey: "wrong" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(/Invalid API key/.test(result.message ?? ""), result.message);
});

Deno.test("test: a 401 plain-text body (the real wire shape) still surfaces the message", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      headers: { "content-type": "text/plain" },
      body:
        "Invalid API key. See https://docs.apollo.io/reference/authentication for how to authenticate.",
    },
  ]);
  const result = await apiKey.test!({ credential: { apiKey: "wrong" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(/Invalid API key/.test(result.message ?? ""), result.message);
});

Deno.test("test: an unexpected status reports it rather than guessing", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(/503/.test(result.message ?? ""), result.message);
});

Deno.test("afterConnect: publishes only email and name, dropping everything else", async () => {
  const { ctx } = mockCtx([
    { body: { id: "u1", first_name: "Ada", last_name: "Lovelace", email: "ada@apollo.io" } },
  ]);
  const label = await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(label, { email: "ada@apollo.io", name: "Ada Lovelace", userId: "u1" });
});

Deno.test("afterConnect: never sets include_credit_usage — no credit balances leave this hook", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.com" } }]);
  await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(pathOf(calls[0].url).includes("include_credit_usage"), false);
  assertEquals(calls[0].url.includes("include_credit_usage"), false);
});

Deno.test("afterConnect: a failed probe fails silently rather than breaking a good connection", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const label = await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(label, {});
});

Deno.test("index: the credential field is declared secret, and the auth type is apiKey", () => {
  assertEquals(apiKey.type, "apiKey");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
