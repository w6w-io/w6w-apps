import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-token.ts";

Deno.test("personal-token: is a bearer method exposing a `token` secret field", () => {
  assertEquals(auth.key, "personal-token");
  assertEquals(auth.type, "bearer");
  const tokenField = auth.fields?.find((f) => f.key === "token");
  assert(tokenField, "must declare a `token` field");
  assertEquals(tokenField.type, "secret");
  assertEquals(tokenField.required, true);
});

Deno.test("personal-token: sign appends Bearer using credential.token", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { token: "priv-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer priv-xyz");
});

Deno.test("personal-token: test hits /users/me/ and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "u1" } }]);
  const result = await auth.test({ credential: { token: "priv-xyz" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v3/users/me/");
  assertEquals(calls[0].headers["authorization"], "Bearer priv-xyz");
});
