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
  const out = await auth.sign!({ request, credential: { apiKey: "sl.abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer sl.abc");
});

Deno.test("access-token: test POSTs users/get_current_account and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: "dbid:1" } }]);
  const result = await auth.test({ credential: { apiKey: "sl.abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/2/users/get_current_account");
  assertEquals(calls[0].headers["authorization"], "Bearer sl.abc");
});

Deno.test("access-token: test surfaces upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
