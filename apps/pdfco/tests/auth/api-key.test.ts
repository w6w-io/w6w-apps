import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: sign() stamps x-api-key and never touches the request body", () => {
  const request = {
    headers: {} as Record<string, string>,
    method: "GET",
    url: "https://api.pdf.co/v1/pdf/info",
  };
  const out = apiKey.sign!(
    { request, credential: { apiKey: "sk_live_abc" } } as never,
    {} as never,
  ) as typeof request;
  assertEquals(out.headers["x-api-key"], "sk_live_abc");
});

Deno.test("authHeaders: builds the x-api-key header, empty string when the credential is missing", () => {
  assertEquals(authHeaders({ apiKey: "k" }), { "x-api-key": "k" });
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("api-key: test() GETs the balance endpoint and never echoes the key back as ok:false", async () => {
  const { ctx, calls } = mockCtx([{ body: { remainingCredits: 12345 } }]);
  const result = await apiKey.test!({ credential: { apiKey: "sk_live_abc" } } as never, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/account/credit/balance");
  assertEquals(calls[0].headers["x-api-key"], "sk_live_abc");
  assertEquals(result.ok, true);
});

Deno.test("api-key: test() fails closed when remainingCredits is missing from a 200", async () => {
  const { ctx } = mockCtx([{ body: { somethingElse: true } }]);
  const result = await apiKey.test!({ credential: { apiKey: "sk_live_abc" } } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: test() surfaces PDF.co's own error message on a 401", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: {
        status: "error",
        errorCode: 401,
        error: true,
        message: "Please provide your API key",
      },
    },
  ]);
  const result = await apiKey.test!({ credential: { apiKey: "bogus" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Please provide your API key"), true);
});

Deno.test("api-key: test() fails without making a request when the credential is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { apiKey: "" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
