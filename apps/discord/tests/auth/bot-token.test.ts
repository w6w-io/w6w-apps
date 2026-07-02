import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/bot-token.ts";

Deno.test("bot-token: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "bot-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("bot-token: sign prepends `Bot ` (NOT `Bearer `) to the token", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { apiKey: "tok-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bot tok-xyz");
});

Deno.test("bot-token: test hits /users/@me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "u1" } }]);
  const result = await auth.test({ credential: { apiKey: "tok-xyz" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/users/@me");
  assertEquals(calls[0].headers["authorization"], "Bot tok-xyz");
});

Deno.test("bot-token: test reports upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("bot-token: test with missing apiKey reports the failure and skips the network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("apiKey"));
  assertEquals(calls.length, 0);
});
