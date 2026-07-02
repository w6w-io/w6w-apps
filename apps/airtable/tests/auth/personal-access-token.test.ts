import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-access-token.ts";

Deno.test("PAT: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "personal-access-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("PAT: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { apiKey: "pat-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer pat-xyz");
});

Deno.test("PAT: test hits /meta/whoami and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "usr1", email: "a@b" } }]);
  const result = await auth.test({ credential: { apiKey: "pat-xyz" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v0/meta/whoami");
  assertEquals(calls[0].headers["authorization"], "Bearer pat-xyz");
});

Deno.test("PAT: test with missing apiKey fails without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("PAT: test returns upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
