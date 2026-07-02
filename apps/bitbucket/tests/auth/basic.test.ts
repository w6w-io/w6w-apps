import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { base64Encode } from "../../auth/basic.ts";

Deno.test("basic: declares username + password (secret) fields", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const username = auth.fields?.find((f) => f.key === "username");
  const password = auth.fields?.find((f) => f.key === "password");
  assert(username, "must declare a `username` field");
  assert(password, "must declare a `password` field");
  assertEquals(username.type, "string");
  assertEquals(username.required, true);
  assertEquals(password.type, "secret");
  assertEquals(password.required, true);
});

Deno.test("basic: sign appends Basic <base64(user:pw)>", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!(
    { request, credential: { username: "alice", password: "hunter2" } },
    ctx,
  );
  // Verifiable against a known encoding: alice:hunter2 → YWxpY2U6aHVudGVyMg==
  assertEquals(out.headers["authorization"], "Basic YWxpY2U6aHVudGVyMg==");
});

Deno.test("basic: test with missing username or password reports the failure and makes no call", async () => {
  const { ctx, calls } = mockCtx();
  const r1 = await auth.test({ credential: { username: "alice" } }, ctx);
  assertEquals(r1.ok, false);
  assert((r1.message ?? "").includes("password") || (r1.message ?? "").includes("username"));
  const r2 = await auth.test({ credential: { password: "hunter2" } }, ctx);
  assertEquals(r2.ok, false);
  assertEquals(calls.length, 0, "must not make a network call when credential is malformed");
});

Deno.test("basic: test hits /user with Basic auth and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: "acc-1" } }]);
  const result = await auth.test(
    { credential: { username: "alice", password: "hunter2" } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/user");
  assertEquals(calls[0].headers["authorization"], "Basic YWxpY2U6aHVudGVyMg==");
});

Deno.test("basic: test returns the upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    { credential: { username: "alice", password: "wrong" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

// The inlined encoder is load-bearing (worker sandbox = no imports). Pin its
// behavior against RFC 4648 test vectors so a regression is obvious.
Deno.test("basic: base64Encode matches RFC-4648 vectors", () => {
  assertEquals(base64Encode(""), "");
  assertEquals(base64Encode("f"), "Zg==");
  assertEquals(base64Encode("fo"), "Zm8=");
  assertEquals(base64Encode("foo"), "Zm9v");
  assertEquals(base64Encode("foob"), "Zm9vYg==");
  assertEquals(base64Encode("fooba"), "Zm9vYmE=");
  assertEquals(base64Encode("foobar"), "Zm9vYmFy");
});

Deno.test("basic: base64Encode handles non-ASCII (UTF-8, not Latin-1)", () => {
  // "☃" (U+2603) → bytes E2 98 83 → 4pi D
  assertEquals(base64Encode("☃"), "4piD");
});
