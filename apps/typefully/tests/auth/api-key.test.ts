import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("authHeaders: builds a bearer header from the credential", () => {
  assertEquals(authHeaders({ apiKey: "tf_secret" }), { authorization: "Bearer tf_secret" });
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("sign: stamps the Authorization header and returns the request untouched otherwise", () => {
  const request = {
    method: "GET",
    url: "https://api.typefully.com/v2/me",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: "tf_secret" } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "Bearer tf_secret");
  assertEquals(signed.url, "https://api.typefully.com/v2/me");
});

Deno.test("test: probes GET /v2/me and reports ok on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Ada" } }]);
  const result = await apiKey.test({ credential: { apiKey: "tf_secret" } }, ctx);
  assertEquals(pathOf(calls[0].url), `/v2${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "Bearer tf_secret");
  assertEquals(result, { ok: true });
});

Deno.test("test: reports the vendor's UNAUTHORIZED code on a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "UNAUTHORIZED", message: "Invalid or missing API key." } },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
  assert(result.message?.includes("UNAUTHORIZED"));
});

Deno.test("test: a missing credential fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: rate-limited during the probe is reported distinctly from a bad key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { code: "RATE_LIMITED", message: "Rate limit exceeded. Try again later." } },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "tf_secret" } }, ctx);
  assertEquals(result.ok, false);
  assert(
    result.message?.toLowerCase().includes("rate-limited") ||
      result.message?.toLowerCase().includes("rate limited"),
  );
});

Deno.test("afterConnect: publishes name/email/userId and swallows failure", async () => {
  const { ctx } = mockCtx([{ body: { id: 7, name: "Ada", email: "ada@example.com" } }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "tf_secret" } }, ctx);
  assertEquals(out, { name: "Ada", email: "ada@example.com", userId: 7 });

  const failing = mockCtx([{ status: 500, body: "" }]);
  const failed = await apiKey.afterConnect!({ credential: { apiKey: "tf_secret" } }, failing.ctx);
  assertEquals(failed, {});
});

Deno.test("the credential field is declared secret, and sign/test are present", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
