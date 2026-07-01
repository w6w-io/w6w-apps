import { assert, assertEquals } from "@std/assert";
import { encodeBase64 } from "@std/encoding";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

Deno.test("basic: declares siteUrl / username / password fields", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assert(keys.includes("siteUrl"));
  assert(keys.includes("username"));
  assert(keys.includes("password"));
  const pw = auth.fields?.find((f) => f.key === "password");
  assertEquals(pw?.type, "secret");
  assertEquals(pw?.required, true);
});

Deno.test("basic: sign injects a Basic Authorization header from username+password", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!(
    { request, credential: { username: "alice", password: "app-pass" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${encodeBase64("alice:app-pass")}`);
});

Deno.test("basic: test hits <siteUrl>/wp-json/wp/v2/users/me with Basic auth", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const result = await auth.test(
    { credential: { siteUrl: "https://example.com", username: "alice", password: "app-pass" } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://example.com/wp-json/wp/v2/users/me");
  assertEquals(calls[0].headers["authorization"], `Basic ${encodeBase64("alice:app-pass")}`);
});

Deno.test("basic: test reports failure without a network call when fields are missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { username: "alice" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    { credential: { siteUrl: "https://example.com", username: "u", password: "p" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
