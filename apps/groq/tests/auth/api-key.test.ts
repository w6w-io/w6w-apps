import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "gsk_xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer gsk_xyz");
});

Deno.test("api-key: test hits /openai/v1/models and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const result = await auth.test({ credential: { apiKey: "gsk_xyz" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/models");
  assertEquals(calls[0].headers["authorization"], "Bearer gsk_xyz");
});

Deno.test("api-key: test with missing apiKey reports the failure without hitting network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("apiKey"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test returns the upstream status on non-2xx", async () => {
  // Groq answers a bad key with a schema-correct 401 body — reachability is
  // proven, the credential just isn't live. `test` reports that as ok:false,
  // not as an outage.
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { message: "Invalid API Key", type: "invalid_request_error" } },
  }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
