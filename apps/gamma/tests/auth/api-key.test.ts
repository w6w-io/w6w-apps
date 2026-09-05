import { assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import apiKey from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: sign stamps the x-api-key header and returns the request", async () => {
  const request: SignableRequest = {
    url: "https://public-api.gamma.app/v1.0/themes",
    method: "GET",
    headers: {},
  };
  const out = await apiKey.sign!(
    { request, credential: { apiKey: "sk-gamma-abc123" } },
    {} as never,
  );
  assertEquals(out.headers["x-api-key"], "sk-gamma-abc123");
});

Deno.test("api-key: test() passes on a 200 from the probe", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], hasMore: false, nextCursor: null } }]);
  const out = await apiKey.test({ credential: { apiKey: "sk-gamma-abc123" } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1.0/themes");
  assertEquals(calls[0].headers["x-api-key"], "sk-gamma-abc123");
  assertEquals(out.ok, true);
});

/**
 * Classify by BODY, never by status code alone: the schema-correct
 * {message, statusCode} error body is what says this key is invalid, not the
 * bare 401.
 */
Deno.test("api-key: test() fails on 401 and surfaces the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Invalid API key.", 401) }]);
  const out = await apiKey.test({ credential: { apiKey: "bad-key" } }, ctx);

  assertEquals(out.ok, false);
  assertEquals(out.message, "Invalid API key.");
});

Deno.test("api-key: test() fails on 403 with a plan-access explanation", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const out = await apiKey.test({ credential: { apiKey: "k" } }, ctx);

  assertEquals(out.ok, false);
  if (!out.message?.includes("plan")) {
    throw new Error(`expected a plan-access explanation, got: ${out.message}`);
  }
});

Deno.test("api-key: test() fails fast when the credential is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: not type "secret"`);
  }
});
