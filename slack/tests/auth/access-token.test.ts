import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: declares bearer type with required apiKey field", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an apiKey field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("access-token: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { apiKey: "xoxb-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer xoxb-abc");
});

Deno.test("access-token: test POSTs /auth.test with the bearer token", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, user: "u", team: "t" } }]);
  const result = await auth.test({ credential: { apiKey: "xoxb-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/auth.test");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], "Bearer xoxb-abc");
});

Deno.test("access-token: test reports Slack-side ok:false as failure", async () => {
  const { ctx } = mockCtx([{ body: { ok: false, error: "invalid_auth" } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("invalid_auth"));
});
