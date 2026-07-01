import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/private-app-token.ts";

Deno.test("private-app-token: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "private-app-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("private-app-token: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { apiKey: "pat-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer pat-xyz");
});

Deno.test("private-app-token: test hits /crm/v3/objects/contacts?limit=1 and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await auth.test({ credential: { apiKey: "pat-xyz" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v3/objects/contacts");
  assertEquals(url.searchParams.get("limit"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer pat-xyz");
});

Deno.test("private-app-token: test reports the upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, statusText: "Unauthorized" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(!result.ok && result.message?.includes("401"));
});
