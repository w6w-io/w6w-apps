import { assert, assertEquals } from "@std/assert";
import auth, { PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-key: is an apiKey method using the Api-Token header, no prefix", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Api-Token" });
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets api-token verbatim, no prefix", () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!({ request, credential: { apiKey: "key-abc" } }, mockCtx().ctx);
  assertEquals((out as { headers: Record<string, string> }).headers["api-token"], "key-abc");
});

Deno.test("api-key: test hits GET /account and reports ok on a real account body", async () => {
  const { ctx, calls } = mockCtx([{ body: { company: "Acme", email: "a@acme.com" } }]);
  const result = await auth.test({ credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, `/api/v2${PROBE_PATH}`);
  assertEquals(calls[0].headers["api-token"], "key-abc");
});

Deno.test("api-key: test classifies a rejected credential by the vendor's `code` field, not just status", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { code: "unauthorized", message: "Key is not provided or does not exists" },
    },
  ]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("unauthorized"));
});

Deno.test("api-key: test never echoes the credential back in its message", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { code: "unauthorized", message: "Key is not provided or does not exists" },
    },
  ]);
  const result = await auth.test({ credential: { apiKey: "super-secret-key" } }, ctx);
  assertEquals(result.message?.includes("super-secret-key"), false);
});

Deno.test("api-key: test rejects a 200 body that is not a WebinarGeek account", async () => {
  const { ctx } = mockCtx([{ body: { unrelated: true } }]);
  const result = await auth.test({ credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(result.ok, false);
});
