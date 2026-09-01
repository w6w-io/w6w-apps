import { assertEquals } from "@std/assert";
import bearer, { authHeader } from "../../auth/bearer.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("authHeader: builds the Bearer header from apiKey", () => {
  assertEquals(authHeader({ apiKey: "test_abc" }), "Bearer test_abc");
  assertEquals(authHeader({}), "Bearer ");
});

Deno.test("sign: stamps the Authorization header and returns the request", () => {
  const request = {
    headers: {} as Record<string, string>,
    url: "https://api.mollie.com/v2/payments",
  };
  const out = bearer.sign!({ request, credential: { apiKey: "live_xyz" } } as never, {} as never);
  assertEquals((out as typeof request).headers["authorization"], "Bearer live_xyz");
});

Deno.test("test: missing apiKey fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await bearer.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: a live profile read is ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pfl_1", name: "My Site", status: "verified" } }]);
  const result = await bearer.test({ credential: { apiKey: "test_good" } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/profiles/me");
  assertEquals(calls[0].headers["authorization"], "Bearer test_good");
  assertEquals(result, { ok: true });
});

Deno.test("test: a 400 Invalid Authorization header is reported as no credential reaching the request", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { status: 400, title: "Bad Request", detail: "Invalid Authorization header" },
  }]);
  const result = await bearer.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(/invalid authorization header/i.test(result.message ?? ""), true);
});

Deno.test("test: a 401 is reported as the API key being rejected", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: 401, title: "Unauthorized Request", detail: "Missing authentication" },
  }]);
  const result = await bearer.test({ credential: { apiKey: "revoked" } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(/rejected the api key/i.test(result.message ?? ""), true);
});

Deno.test("afterConnect: labels mode from the live_/test_ prefix and profile name from the read", async () => {
  const { ctx } = mockCtx([{ body: { id: "pfl_1", name: "My Site", status: "verified" } }]);
  const out = await bearer.afterConnect!({ credential: { apiKey: "live_xyz" } } as never, ctx);

  assertEquals(out, {
    mode: "live",
    profileName: "My Site",
    profileId: "pfl_1",
    profileStatus: "verified",
  });
});

Deno.test("afterConnect: an unrecognized prefix is labeled honestly, not guessed", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { status: 400, detail: "Invalid Authorization header" },
  }]);
  const out = await bearer.afterConnect!({ credential: { apiKey: "weird_prefix" } } as never, ctx);
  assertEquals((out as { mode: string }).mode, "unknown mode");
});
