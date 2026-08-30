import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "unit-test-fixture-not-a-real-key-00000000";

Deno.test("api-key: sign stamps the apikey header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://developers.teachable.com/v1/courses",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.apikey, KEY);
  assertEquals(signed.headers.authorization, undefined);
  assertEquals(signed.url, "https://developers.teachable.com/v1/courses");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { apikey: KEY });
});

Deno.test("api-key: the probe is /courses", () => {
  assertEquals(PROBE_PATH, "/courses");
});

Deno.test("api-key: test passes when the courses endpoint answers", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("courses", []) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/courses");
  assertEquals(queryOf(calls[0].url), { per: "1" });
  assertEquals(calls[0].headers.apikey, KEY);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The two 401 bodies measured live are different problems ("never reached the
 * request" vs "wrong key") and this is the file most likely to collapse them
 * back into one generic message.
 */
Deno.test("api-key: a missing header is reported as never having arrived", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("No API key found in request") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no apiKey header/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an invalid key is reported as a rejected key, not a missing one", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("Invalid authentication credentials") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the key/i.test(result.message ?? ""), result.message);
  assert(!/received no apiKey/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

/** `message` can be an array of validation lines, not just a string — the ErrorResponse `oneOf`. */
Deno.test("api-key: an array-shaped error message is flattened, not dropped", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(["Invalid authentication credentials", "try again"]) },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/try again/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect publishes a course name for the connection label", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("courses", [{ id: 1, name: "Intro to Painting" }]) },
  ]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/courses");
  assertEquals(display, { schoolExample: "Intro to Painting" });
});

Deno.test("api-key: afterConnect falls back when the school has no courses yet", async () => {
  const { ctx } = mockCtx([{ body: envelope("courses", []) }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(display, { schoolExample: "connected" });
});

Deno.test("api-key: afterConnect stays silent when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Invalid authentication credentials") }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});
