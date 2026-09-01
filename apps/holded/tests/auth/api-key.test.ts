import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-key: type and header shape", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "key" });
});

Deno.test("authHeaders: builds a raw `key` header, not Bearer", () => {
  assertEquals(authHeaders({ apiKey: "abc123" }), { key: "abc123" });
  assertEquals(authHeaders({}), { key: "" });
});

Deno.test("sign: stamps the key header and returns the request unchanged otherwise", () => {
  const request = {
    url: "https://api.holded.com/api/crm/v1/funnels",
    headers: {},
    body: undefined,
  };
  const out = apiKey.sign!({ request, credential: { apiKey: "secret-key" } } as never, {} as never);
  assertEquals((out as typeof request).headers, { key: "secret-key" });
});

Deno.test("test: ok on a 200 response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const result = await apiKey.test!({ credential: { apiKey: "good-key" } } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].headers.key, "good-key");
  assertEquals(calls[0].url, "https://api.holded.com/api/crm/v1/funnels");
});

Deno.test("test: missing apiKey fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: gateway 401 with no info reports 'no key reached the request'", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: 401 } }]);
  const result = await apiKey.test!({ credential: { apiKey: "x" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("received no key"), true);
});

Deno.test("test: invalid-key 400 reports Holded's own info", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { status: 0, info: "Invalid key" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "bogus" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Holded rejected the key (400): Invalid key");
});

Deno.test("test: never puts the credential in the returned message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { status: 0, info: "Invalid key" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "super-secret-value" } } as never, ctx);
  assertEquals(result.message?.includes("super-secret-value"), false);
});
