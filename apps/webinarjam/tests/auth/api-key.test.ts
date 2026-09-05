import { assert, assertEquals } from "@std/assert";
import apiKey, { mergeApiKey, PROBE_PATH } from "../../auth/api-key.ts";
import { API_KEY, failure, mockCtx, ok } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest): SignableRequest {
  const { ctx } = mockCtx([]);
  return apiKey.sign!(
    { request, credential: { apiKey: API_KEY } } as never,
    ctx,
  ) as SignableRequest;
}

Deno.test("auth: a single secret field, since WebinarJam issues one account-wide key", () => {
  assertEquals(apiKey.key, "api-key");
  // `custom`, not `apiKey`: the credential rides in the form BODY, which no
  // header/query-placement block describes.
  assertEquals(apiKey.type, "custom");
  const fields = apiKey.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["apiKey"]);
  assert(fields[0].type === "secret", "the key must be a secret field");
});

Deno.test("mergeApiKey: adds api_key to an empty body", () => {
  const out = mergeApiKey("", API_KEY);
  assertEquals(new URLSearchParams(out).get("api_key"), API_KEY);
});

Deno.test("mergeApiKey: adds api_key alongside fields an action already set", () => {
  const out = mergeApiKey("webinar_id=5", API_KEY);
  const params = new URLSearchParams(out);
  assertEquals(params.get("webinar_id"), "5");
  assertEquals(params.get("api_key"), API_KEY);
});

Deno.test("mergeApiKey: the Connection's key overwrites anything an action somehow set", () => {
  const out = mergeApiKey("api_key=SNEAKY", API_KEY);
  assertEquals(new URLSearchParams(out).get("api_key"), API_KEY);
});

Deno.test("sign: rewrites the request BODY and sets the form content-type", () => {
  const signed = signWith({
    url: "https://api.webinarjam.com/webinarjam/webinars",
    method: "POST",
    headers: {},
    body: "",
  });
  assertEquals(new URLSearchParams(signed.body!).get("api_key"), API_KEY);
  assertEquals(signed.headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("sign: an action's other fields survive alongside the credential", () => {
  const signed = signWith({
    url: "https://api.webinarjam.com/webinarjam/webinar",
    method: "POST",
    headers: {},
    body: "webinar_id=5",
  });
  const params = new URLSearchParams(signed.body!);
  assertEquals(params.get("webinar_id"), "5");
  assertEquals(params.get("api_key"), API_KEY);
});

Deno.test("test: PROBE_PATH is /webinarjam/webinars, the zero-parameter-besides-key endpoint", () => {
  assertEquals(PROBE_PATH, "/webinarjam/webinars");
});

Deno.test("test: a live key returns ok", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ webinars: [] }) }]);
  const result = await apiKey.test!({ credential: { apiKey: API_KEY } } as never, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, `https://api.webinarjam.com${PROBE_PATH}`);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URLSearchParams(calls[0].body!).get("api_key"), API_KEY);
});

Deno.test("test: rejects a missing key without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { apiKey: "" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("apiKey"), result.message);
  assertEquals(calls.length, 0);
});

/**
 * Both failure shapes observed live — missing key (400) and invalid key (401)
 * — must classify from the BODY, not the status code alone, and must not
 * merely say "unauthorized".
 */
Deno.test("test: classifies a rejected key from the response body, not the status code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: failure({ api_key: "You must specify a valid API key" }),
  }]);
  const result = await apiKey.test!({ credential: { apiKey: API_KEY } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("You must specify a valid API key"), result.message);
});

Deno.test("test: the array-shaped errors.api_key value (400, missing field) is also readable", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: failure({ api_key: ["The api key field is required."] }),
  }]);
  const result = await apiKey.test!({ credential: { apiKey: API_KEY } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("The api key field is required."), result.message);
});

Deno.test("test: never echoes the credential back in its message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: failure({ api_key: "You must specify a valid API key" }),
  }]);
  const result = await apiKey.test!({ credential: { apiKey: API_KEY } } as never, ctx);
  assert(!result.message!.includes(API_KEY), "the probe echoed the credential back");
});

Deno.test("test: an unreadable body is a clear failure, not a throw", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "not json" }]);
  const result = await apiKey.test!({ credential: { apiKey: API_KEY } } as never, ctx);
  assertEquals(result.ok, false);
});
