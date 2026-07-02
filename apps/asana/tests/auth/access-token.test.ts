import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("access-token: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "pat-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer pat-xyz");
});

Deno.test("access-token: test hits /users/me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { gid: "u1" } } }]);
  const result = await auth.test({ credential: { apiKey: "pat-xyz" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer pat-xyz");
});

Deno.test("access-token: test surfaces upstream failure status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("access-token: afterConnect extracts { id, name, email } from data envelope", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { gid: "u1", name: "Ada", email: "ada@example.com" } },
  }]);
  const out = await auth.afterConnect!({ credential: { apiKey: "x" } }, ctx);
  assertEquals(out, { user: { id: "u1", name: "Ada", email: "ada@example.com" } });
});
