import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a bearer method exposing appId + apiKey fields", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const appIdField = auth.fields?.find((f) => f.key === "appId");
  assert(appIdField, "must declare an `appId` field");
  assertEquals(appIdField.required, true);
  const apiKeyField = auth.fields?.find((f) => f.key === "apiKey");
  assert(apiKeyField, "must declare an `apiKey` field");
  assertEquals(apiKeyField.type, "secret");
  assertEquals(apiKeyField.required, true);
});

Deno.test("api-key: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "adalo-secret" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer adalo-secret");
});

Deno.test("api-key: afterConnect echoes appId into connection.display", () => {
  const result = auth.afterConnect!(
    { credential: { appId: "app-1", apiKey: "adalo-secret" } } as never,
    undefined as never,
  );
  assertEquals(result, { appId: "app-1" });
});

Deno.test("api-key: test reports ok when the probe request gets past the credential gate", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "rec1" } }]);
  const result = await auth.test({ credential: { appId: "app-1", apiKey: "good" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.adalo.com");
  assertEquals(url.pathname, "/v0/apps/app-1/collections/w6w-connectivity-check");
  assertEquals(calls[0].headers["authorization"], "Bearer good");
});

Deno.test("api-key: test reports ok even when the placeholder collection itself is not found", async () => {
  // A 404-shaped "no such collection" response — distinct from the auth-error
  // body — still means the credential got past the check.
  const { ctx } = mockCtx([{ status: 404, body: { error: "Collection not found" } }]);
  const result = await auth.test({ credential: { appId: "app-1", apiKey: "good" } }, ctx);
  assertEquals(result.ok, true);
});

Deno.test("api-key: test classifies a 401 invalid-token body as a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Invalid access token" } }]);
  const result = await auth.test({ credential: { appId: "app-1", apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Invalid access token"));
});

Deno.test("api-key: test classifies a 403 as a plan/quota/permission problem, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const result = await auth.test({ credential: { appId: "app-1", apiKey: "good" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.match(/plan|permission/i));
});

Deno.test("api-key: test fails closed when a field is missing, without calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: { apiKey: "good" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
