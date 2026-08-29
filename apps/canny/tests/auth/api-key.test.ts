import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { bodyOf, errorBody, mockCtx } from "../_helpers.ts";

const KEY = "unit-test-fixture-not-a-real-canny-key";

Deno.test("api-key: sign merges apiKey into an existing JSON body", () => {
  const request = {
    method: "POST",
    url: "https://canny.io/api/v1/boards/list",
    headers: {} as Record<string, string>,
    body: JSON.stringify({ boardID: "b1" }),
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    body: string;
    headers: Record<string, string>;
  };

  assertEquals(JSON.parse(signed.body), { boardID: "b1", apiKey: KEY });
  assertEquals(signed.headers["content-type"], "application/json");
});

Deno.test("api-key: sign builds a body from scratch when the action sent none", () => {
  const request = { method: "POST", url: "https://canny.io/api/v1/boards/list", headers: {} };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    body: string;
  };

  assertEquals(JSON.parse(signed.body), { apiKey: KEY });
});

Deno.test("api-key: sign never puts the credential in a header or the URL", () => {
  const request = {
    method: "POST",
    url: "https://canny.io/api/v1/boards/list",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assert(!signed.url.includes(KEY));
  assert(Object.values(signed.headers).every((v) => !v.includes(KEY)));
});

Deno.test("api-key: test passes when the boards probe answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { boards: [] } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://canny.io/api/v1/boards/list");
  assertEquals(bodyOf(calls[0]), { apiKey: KEY });
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: an invalid key is reported clearly, using Canny's own message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("invalid api key") }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the api key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a different error message is surfaced verbatim, not swallowed", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("something else went wrong") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/something else went wrong/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a non-JSON 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret");
  }
});

Deno.test("api-key: apiKey is declared as body-located, matching sign", () => {
  assertEquals(apiKey.apiKey, { in: "body", name: "apiKey" });
});
