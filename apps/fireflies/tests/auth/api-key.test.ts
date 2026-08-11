import { assert, assertEquals } from "@std/assert";
import { AUTH_FAILED_500, mockCtx, sent } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { API_URL } from "../../lib/client.ts";

Deno.test("api-key: sign stamps a Bearer header and returns the request", () => {
  const request = { url: API_URL, method: "POST", headers: {} as Record<string, string> };
  // deno-lint-ignore no-explicit-any
  const out = auth.sign!({ request, credential: { apiKey: "ff_secret" } } as any, null as any);
  assertEquals((out as typeof request).headers["authorization"], "Bearer ff_secret");
});

Deno.test("api-key: test accepts a live key", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { user: { user_id: "u1", name: "A" } } } }]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, API_URL);
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

Deno.test("api-key: the probe asks for account metadata only, never a key-bearing field", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { user: { user_id: "u1" } } } }]);
  // deno-lint-ignore no-explicit-any
  await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  const query = sent(calls[0]).query;
  assertEquals(query, "{ user { user_id name email } }");
  // Nothing in the selection set can echo the caller's own credential back —
  // the failure mode that rules out Mailjet's /apikey and FUB's /me as probes.
  for (const field of ["api_key", "apiKey", "token", "secret", "integrations"]) {
    assert(!query.includes(field), `probe selects ${field}`);
  }
});

Deno.test("api-key: test rejects a bad key as a credential problem, not an outage", async () => {
  // The live behaviour: HTTP 500 + auth_failed. `res.ok` would say "down".
  const { ctx } = mockCtx([AUTH_FAILED_500]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "bad" } } as any, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("auth_failed"));
});

Deno.test("api-key: test does not call the API when no credential was supplied", async () => {
  const { ctx, calls } = mockCtx([]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: {} } as any, ctx);
  assertEquals(res, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test refuses a 200 that carries no user", async () => {
  const { ctx } = mockCtx([{ body: { data: { user: null } } }]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(res.ok, false);
});

Deno.test("api-key: afterConnect returns the label variables and sends no credential itself", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { user: { user_id: "u1", name: "Ada", email: "ada@example.com" } } },
  }]);
  // deno-lint-ignore no-explicit-any
  const out = await auth.afterConnect!({} as any, ctx);
  assertEquals(out, { user: { user_id: "u1", name: "Ada", email: "ada@example.com" } });
  // The runtime routes this through `sign`; the hook must not stamp auth itself.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(auth.connectionLabel, "{{user.name}} ({{user.email}})");
});

Deno.test("api-key: afterConnect degrades to no label rather than throwing", async () => {
  const { ctx } = mockCtx([AUTH_FAILED_500]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await auth.afterConnect!({} as any, ctx), {});
});
