import { assertEquals, assertMatch } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import apiKey, { OVERVIEW_URL } from "../../auth/api-key.ts";
import { basicAuthHeader } from "../../lib/client.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("sign: stamps HTTP Basic with the key as username, empty password", async () => {
  const request: SignableRequest = {
    url: "https://api.tickettailor.com/v1/orders",
    method: "GET",
    headers: {},
  };
  const out = await apiKey.sign!({ request, credential: { apiKey: "sk_live_abc" } }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], basicAuthHeader("sk_live_abc"));
});

Deno.test("test: ok on a 200 from /v1/overview", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { box_office_name: "Acme" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "sk_live_abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, OVERVIEW_URL);
  assertEquals(calls[0].headers["authorization"], basicAuthHeader("sk_live_abc"));
});

Deno.test("test: fails with the vendor's collapsed FORBIDDEN message on a bad key", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody("FORBIDDEN", "You do not have permission to perform the request.", {
        hint: "Check if API key is not deleted...",
      }),
    },
  ]);
  const result = await apiKey.test!({ credential: { apiKey: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assertMatch(result.message ?? "", /FORBIDDEN/);
  assertMatch(result.message ?? "", /Check if API key/);
});

Deno.test("test: fails immediately (no fetch) when apiKey is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: publishes box_office_name, swallows a failed read", async () => {
  const ok = mockCtx([{ status: 200, body: { box_office_name: "Acme Events" } }]);
  const okResult = await apiKey.afterConnect!({ credential: { apiKey: "sk_live_abc" } }, ok.ctx);
  assertEquals(okResult, { boxOfficeName: "Acme Events" });

  const failing = mockCtx([{ status: 500, body: {} }]);
  const failResult = await apiKey.afterConnect!(
    { credential: { apiKey: "sk_live_abc" } },
    failing.ctx,
  );
  assertEquals(failResult, {});
});
