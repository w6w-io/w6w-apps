import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a custom method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "custom");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets `x-api-key` (lowercase, no Bearer prefix)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.anthropic.com/v1/messages",
    method: "POST" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "sk-ant-xyz" } }, ctx);

  // Case-sensitive key check — Anthropic 401s on `Authorization: Bearer …`.
  assertEquals(out.headers["x-api-key"], "sk-ant-xyz");
  assert(!("authorization" in out.headers), "must not add Authorization header");
  assert(!("X-Api-Key" in out.headers), "header key must be lowercase `x-api-key`");
  assert(!out.headers["x-api-key"].startsWith("Bearer "), "value must be the raw key, no prefix");
});

Deno.test("api-key: test hits /v1/models with x-api-key + anthropic-version", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "claude-opus-4-1" }] } }]);
  const result = await auth.test({ credential: { apiKey: "sk-ant-xyz" } }, ctx);

  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/models");
  assertEquals(calls[0].headers["x-api-key"], "sk-ant-xyz");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
});

Deno.test("api-key: test rejects when response lacks `data` array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { unexpected: "shape" } }]);
  const result = await auth.test({ credential: { apiKey: "sk-ant-xyz" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: test surfaces HTTP errors", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "unauthorized" } }]);
  const result = await auth.test({ credential: { apiKey: "sk-ant-bad" } }, ctx);
  assertEquals(result.ok, false);
});
