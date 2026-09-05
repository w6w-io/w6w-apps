import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import bearerToken from "../../auth/bearer-token.ts";
import { invalidTokenBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bearer-token: sign() stamps the Authorization header and never calls fetch", async () => {
  const request: SignableRequest = {
    url: "https://api.littlegreenlight.com/api/v1/constituents.json",
    method: "GET",
    headers: {},
  };
  const signed = await bearerToken.sign!({ request, credential: { token: "secret-token" } }, {} as never);
  assertEquals(signed.headers["authorization"], "Bearer secret-token");
});

Deno.test("bearer-token: test() succeeds on a 200", async () => {
  const { ctx } = mockCtx([{ body: { items: [] } }]);
  const out = await bearerToken.test({ credential: { token: "good-token" } }, ctx);
  assertEquals(out, { ok: true });
});

Deno.test("bearer-token: test() probes /api/v1/constituents.json?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await bearerToken.test({ credential: { token: "good-token" } }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/constituents.json");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "1");
});

Deno.test("bearer-token: test() classifies a 401 from the structured invalid_token body, not the bare status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: invalidTokenBody("expired") }]);
  const out = await bearerToken.test({ credential: { token: "garbage" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("expired"));
});

Deno.test("bearer-token: test() fails cleanly when the credential is missing a token", async () => {
  const { ctx } = mockCtx([]);
  const out = await bearerToken.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("bearer-token: test() falls back to formatLglError on an unrecognized non-401 failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "internal error" }]);
  const out = await bearerToken.test({ credential: { token: "good-token" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("500"));
});

Deno.test("bearer-token: the credential field is declared secret", () => {
  const secretFields = bearerToken.fields?.filter((f) => f.key === "token") ?? [];
  assertEquals(secretFields.length, 1);
  for (const f of secretFields) {
    assertEquals(f.type, "secret");
  }
});
