import { assert, assertEquals } from "@std/assert";
import { PatreonApiError, PatreonClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: GET requests carry no body and hit the v2 base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", type: "user" } } }]);
  const out = await new PatreonClient(ctx).request("/identity");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).pathname, "/api/oauth2/v2/identity");
  assertEquals(out, { data: { id: "1", type: "user" } });
});

Deno.test("client: bracketed JSON:API query params are set and percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new PatreonClient(ctx).request("/campaigns", {
    query: { "fields[campaign]": "created_at,summary", include: "tiers" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields[campaign]"), "created_at,summary");
  assertEquals(url.searchParams.get("include"), "tiers");
  assert(calls[0].url.includes("fields%5Bcampaign%5D"));
});

Deno.test("client: undefined/null/empty query values are omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new PatreonClient(ctx).request("/campaigns", {
    query: { include: undefined, "fields[campaign]": null, "fields[tier]": "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("include"), false);
  assertEquals(url.searchParams.has("fields[campaign]"), false);
  assertEquals(url.searchParams.has("fields[tier]"), false);
});

Deno.test("client: a write request wraps the body under { data: ... }", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", type: "webhook" } } }]);
  await new PatreonClient(ctx).request("/webhooks", {
    method: "POST",
    body: { type: "webhook", attributes: { uri: "https://x" } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "webhook", attributes: { uri: "https://x" } },
  });
});

Deno.test("client: a 204 with no body parses to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new PatreonClient(ctx).request("/webhooks/1", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("client: a non-2xx throws PatreonApiError carrying the JSON:API error detail", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errors: [{ status: "401", code_name: "Unauthorized", detail: "Invalid access token" }],
    },
  }]);
  try {
    await new PatreonClient(ctx).request("/identity");
    throw new Error("expected request() to throw");
  } catch (err) {
    assert(err instanceof PatreonApiError);
    assertEquals(err.status, 401);
    assertEquals(err.errors[0].code_name, "Unauthorized");
    assert(err.message.includes("Invalid access token"));
  }
});

Deno.test("client: a non-2xx with no parseable body still throws with the status text", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Internal Server Error", body: "not json" }]);
  try {
    await new PatreonClient(ctx).request("/identity");
    throw new Error("expected request() to throw");
  } catch (err) {
    assert(err instanceof PatreonApiError);
    assertEquals(err.status, 500);
  }
});
