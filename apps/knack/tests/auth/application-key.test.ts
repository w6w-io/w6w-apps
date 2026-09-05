import { assert, assertEquals } from "@std/assert";
import applicationKey, { authHeaders } from "../../auth/application-key.ts";
import { mockCtx } from "../_helpers.ts";

const APP_ID = "5f1a1a1a1a1a1a1a1a1a1a1a";
const API_KEY = "abcdef0123456789abcdef01";
const OBJECT_KEY = "object_1";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, credential: Record<string, unknown>): SignableRequest {
  const { ctx } = mockCtx([]);
  return applicationKey.sign!({ request, credential } as never, ctx) as SignableRequest;
}

Deno.test("auth: declares the two-header credential plus the test-only object key", () => {
  assertEquals(applicationKey.key, "application-key");
  assertEquals(applicationKey.type, "custom");
  const fields = applicationKey.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["applicationId", "apiKey", "testObject"]);
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  // Not secret: Knack's own docs say the Application ID ships in client-side code.
  assertEquals(fields.find((f) => f.key === "applicationId")?.type, "string");
});

Deno.test("authHeaders: builds Knack's two literal header names", () => {
  assertEquals(authHeaders({ applicationId: APP_ID, apiKey: API_KEY }), {
    "x-knack-application-id": APP_ID,
    "x-knack-rest-api-key": API_KEY,
  });
});

Deno.test("sign: stamps both headers and leaves the URL alone", () => {
  const request = {
    url: `https://api.knack.com/v1/objects/${OBJECT_KEY}/records`,
    headers: {} as Record<string, string>,
  };
  const signed = signWith(request, { applicationId: APP_ID, apiKey: API_KEY });
  assertEquals(signed.headers["x-knack-application-id"], APP_ID);
  assertEquals(signed.headers["x-knack-rest-api-key"], API_KEY);
  assertEquals(signed.url, request.url);
});

Deno.test("test: reports missing credential fields without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    (await applicationKey.test(
      { credential: { apiKey: API_KEY, testObject: OBJECT_KEY } } as never,
      ctx,
    ))
      .ok,
    false,
  );
  assertEquals(
    (await applicationKey.test(
      { credential: { applicationId: APP_ID, testObject: OBJECT_KEY } } as never,
      ctx,
    )).ok,
    false,
  );
  assertEquals(
    (await applicationKey.test(
      { credential: { applicationId: APP_ID, apiKey: API_KEY } } as never,
      ctx,
    )).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

Deno.test("test: probes the test Object key with rows_per_page=1 and both headers", async () => {
  const { ctx, calls } = mockCtx([{
    body: { total_pages: 1, current_page: 1, total_records: 0, records: [] },
  }]);
  const result = await applicationKey.test(
    { credential: { applicationId: APP_ID, apiKey: API_KEY, testObject: OBJECT_KEY } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(
    calls[0].url,
    `https://api.knack.com/v1/objects/${OBJECT_KEY}/records?rows_per_page=1`,
  );
  assertEquals(calls[0].headers["x-knack-application-id"], APP_ID);
  assertEquals(calls[0].headers["x-knack-rest-api-key"], API_KEY);
});

/** Knack's error bodies are plain text, not JSON — confirmed live 2026-09-05. */
Deno.test("test: names a malformed Application ID from the exact vendor string", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Malformed App ID." }]);
  const result = await applicationKey.test(
    {
      credential: { applicationId: "not-an-id", apiKey: API_KEY, testObject: OBJECT_KEY },
    } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("malformed"), result.message);
});

/** The vendor sometimes prefixes this with `ValidationError: ` — matched by substring, not equality. */
Deno.test("test: matches the malformed-App-ID string even with a ValidationError prefix", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "ValidationError: Malformed App ID." }]);
  const result = await applicationKey.test(
    { credential: { applicationId: "abc", apiKey: API_KEY, testObject: OBJECT_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("malformed"), result.message);
});

Deno.test("test: names a rejected API key from Invalid API key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Invalid API key" }]);
  const result = await applicationKey.test(
    { credential: { applicationId: APP_ID, apiKey: "wrong", testObject: OBJECT_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("API key"), result.message);
});

Deno.test("test: names a missing Application ID from Invalid API Request", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Invalid API Request" }]);
  const result = await applicationKey.test(
    { credential: { applicationId: APP_ID, apiKey: API_KEY, testObject: OBJECT_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(/reconnect/i.test(result.message!), result.message);
});

/** No documented distinct error for "credential fine, Object key is wrong" — reported as-is. */
Deno.test("test: an unrecognised failure names the status and suggests checking the Object key", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Object does not exist." }]);
  const result = await applicationKey.test(
    {
      credential: { applicationId: APP_ID, apiKey: API_KEY, testObject: "object_999" },
    } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("object_999"), result.message);
  assert(result.message!.includes("400"), result.message);
});

Deno.test("afterConnect: republishes applicationId and testObject, never the API key", () => {
  const display = applicationKey.afterConnect!(
    { credential: { applicationId: APP_ID, apiKey: API_KEY, testObject: OBJECT_KEY } } as never,
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(display.applicationId, APP_ID);
  assertEquals(display.testObject, OBJECT_KEY);
  assert(!JSON.stringify(display).includes(API_KEY), "republished the API key");
});
