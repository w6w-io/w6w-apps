import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: apiKey type, query param named auth_token", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "query", name: "auth_token" });
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["apiKey"]);
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[0].required, true);
});

Deno.test("api-key: sign appends auth_token to the request URL's query string", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.getvero.com/api/v2/users/track",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "vero_secret_123" } }, ctx);
  const url = new URL(out.url);
  assertEquals(url.searchParams.get("auth_token"), "vero_secret_123");
});

Deno.test("api-key: sign preserves an existing query string", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.getvero.com/api/v2/users/track?foo=bar",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k" } }, ctx);
  const url = new URL(out.url);
  assertEquals(url.searchParams.get("foo"), "bar");
  assertEquals(url.searchParams.get("auth_token"), "k");
});

Deno.test("api-key: test rejects a credential missing apiKey, without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test PUTs a minimal update-only identify call to /users/track", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 200, message: "Success." } }]);
  assertEquals(await auth.test({ credential: { apiKey: "vero_secret_123" } }, ctx), { ok: true });
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.getvero.com/api/v2/users/track");
  assertEquals(url.searchParams.get("auth_token"), "vero_secret_123");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    id: "w6w-connection-test",
    extras: { update_only: "true" },
  });
});

Deno.test("api-key: test reads Vero's own body status, not just the HTTP status", async () => {
  // A 200 whose body says something other than status:200 must not be trusted.
  const { ctx } = mockCtx([{ status: 200, body: { status: 401, message: "nope" } }]);
  assertEquals(await auth.test({ credential: { apiKey: "bad" } }, ctx), {
    ok: false,
    message: "nope",
  });
});

Deno.test("api-key: test surfaces a non-2xx as a failed check", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { status: 401, message: "Invalid authentication" } },
  ]);
  assertEquals(await auth.test({ credential: { apiKey: "bad" } }, ctx), {
    ok: false,
    message: "Invalid authentication",
  });
});
