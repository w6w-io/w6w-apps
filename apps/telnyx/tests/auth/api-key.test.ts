import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiKey from "../../auth/api-key.ts";

const CRED = { apiKey: "KEY0123456789abcdef" };

Deno.test("auth: declares a bearer method with a single secret field", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].key, "apiKey");
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});

Deno.test("sign: stamps `Authorization: Bearer <key>` onto the request and returns it", () => {
  const request = {
    url: "https://api.telnyx.com/v2/messages",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: CRED } as never,
    {} as never,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], `Bearer ${CRED.apiKey}`);
});

/** `sign` is the only hook handed the credential, and it must not do network I/O. */
Deno.test("sign: makes no network call", () => {
  const { ctx, calls } = mockCtx([]);
  apiKey.sign!(
    {
      request: { url: "https://api.telnyx.com/v2/messages", headers: {} },
      credential: CRED,
    } as never,
    ctx as never,
  );
  assertEquals(calls.length, 0);
});

Deno.test("test: probes GET /phone_numbers/slim with the bearer header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: { total_results: 0 } } }]);
  const result = await apiKey.test({ credential: CRED } as never, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/phone_numbers/slim");
  assertEquals(url.searchParams.get("page[size]"), "1");
  assertEquals(calls[0].headers["authorization"], `Bearer ${CRED.apiKey}`);
});

Deno.test("test: succeeds even when the account owns zero numbers", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [], meta: { total_results: 0 } } }]);
  assertEquals(await apiKey.test({ credential: CRED } as never, ctx), { ok: true });
});

/**
 * Telnyx's own OpenAPI examples give this exact shape for a bad key, across
 * every namespace (`numbers_Errors`, `messaging_Errors`, `call-control_Errors`):
 * `{"errors":[{"code":"10009","title":"Authentication failed", ...}]}`.
 * `test` reads this structure rather than trusting a specific HTTP status.
 */
Deno.test("test: fails on a 401 and surfaces the vendor's structured error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errors: [{
        code: "10009",
        title: "Authentication failed",
        detail:
          "The required authentication headers were either invalid or not included in the request.",
      }],
    },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("10009"), result.message);
  assert(result.message!.includes("Authentication failed"), result.message);
});

Deno.test("test: does not classify from status code alone — reads the body even on other 4xx", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { errors: [{ code: "99999", title: "Forbidden", detail: "Scope missing." }] },
  }]);
  const result = await apiKey.test({ credential: CRED } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("Scope missing"), result.message);
});

Deno.test("test: falls back to the bare status when the body carries no errors array", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await apiKey.test({ credential: CRED } as never, ctx);
  assertEquals(result, { ok: false, message: "Telnyx returned 500" });
});

Deno.test("test: does not echo the credential back in its result", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ code: "10009", title: "Authentication failed", detail: "bad" }] },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "super-secret-value" } } as never, ctx);
  assert(!JSON.stringify(result).includes("super-secret-value"));
});
