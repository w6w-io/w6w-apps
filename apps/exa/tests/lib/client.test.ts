import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ExaApiError, ExaClient } from "../../lib/client.ts";

Deno.test("ExaClient: GET builds the URL against api.exa.ai and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new ExaClient(ctx);
  await client.request("/v0/websets", { query: { search: "", limit: 5, cursor: undefined } });

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.exa.ai");
  assertEquals(url.pathname, "/v0/websets");
  assertEquals(url.searchParams.has("search"), false);
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.has("cursor"), false);
});

Deno.test("ExaClient: POST sends a JSON body with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ body: { requestId: "r1" } }]);
  const client = new ExaClient(ctx);
  await client.request("/search", { method: "POST", body: { query: "hello" } });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { query: "hello" });
});

Deno.test("ExaClient: never sets x-api-key itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ExaClient(ctx).request("/v0/teams/me");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("ExaClient: throws ExaApiError carrying the vendor's tag on a non-2xx response", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { requestId: "r1", error: "Invalid API key", tag: "INVALID_API_KEY" } },
  ]);
  const client = new ExaClient(ctx);
  try {
    await client.request("/search", { method: "POST", body: { query: "x" } });
    throw new Error("expected request() to throw");
  } catch (err) {
    assert(err instanceof ExaApiError);
    assertEquals(err.status, 401);
    assertEquals(err.tag, "INVALID_API_KEY");
    assert(err.message.includes("INVALID_API_KEY"));
    assert(err.message.includes("Invalid API key"));
  }
});

Deno.test("ExaClient: a 204 returns undefined without attempting to parse a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const result = await new ExaClient(ctx).request("/v0/websets/w_1", { method: "DELETE" });
  assertEquals(result, undefined);
});
