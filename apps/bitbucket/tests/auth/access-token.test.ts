import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const apiKey = auth.fields?.find((f) => f.key === "apiKey");
  assert(apiKey, "must declare an `apiKey` field");
  assertEquals(apiKey.type, "secret");
  assertEquals(apiKey.required, true);
});

Deno.test("access-token: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { apiKey: "tok-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok-xyz");
});

Deno.test("access-token: test with missing apiKey reports the failure and makes no call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("apiKey"));
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test hits /user with Bearer and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: "acc-1" } }]);
  const result = await auth.test({ credential: { apiKey: "tok-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/user");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-abc");
});

Deno.test("access-token: test returns the upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
