import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { AdaloClient, appIdFromConnection } from "../../lib/client.ts";

Deno.test("client: prefixes the v0/apps/{appId} base URL and defaults to GET", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  const client = new AdaloClient(ctx, "app-1");
  await client.request("/collections/c1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.adalo.com");
  assertEquals(url.pathname, "/v0/apps/app-1/collections/c1");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: encodes the appId in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new AdaloClient(ctx, "app 1/2");
  await client.request("/collections/c1");
  assertEquals(new URL(calls[0].url).pathname, "/v0/apps/app%201%2F2/collections/c1");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new AdaloClient(ctx, "app-1");
  const result = await client.request("/collections/c1/r1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 401, statusText: "Unauthorized", body: '{"error":"Invalid access token"}' },
  ]);
  const client = new AdaloClient(ctx, "app-1");
  const err = await assertRejects(
    () => client.request("/collections/c1"),
    Error,
    "Adalo 401",
  );
  assertEquals(err.message.includes("/v0/apps/app-1/collections/c1"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  const client = new AdaloClient(ctx, "app-1");
  await client.request("/collections/c1", {
    query: { limit: 5, offset: undefined, filterKey: null, filterValue: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.has("offset"), false);
  assertEquals(url.searchParams.has("filterKey"), false);
  assertEquals(url.searchParams.has("filterValue"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  const client = new AdaloClient(ctx, "app-1");
  await client.request("/collections/c1", { method: "POST", body: { Name: "Ada" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { Name: "Ada" });
});

Deno.test("appIdFromConnection: reads display.appId", () => {
  const connection = {
    id: "c",
    app: "io.w6w.adalo",
    auth: "api-key",
    owner: "u",
    state: "connected" as const,
    display: { appId: "app-1" },
    createdAt: "2026-01-01T00:00:00Z",
  };
  assertEquals(appIdFromConnection(connection), "app-1");
});

Deno.test("appIdFromConnection: throws a clear error when the connection has no appId", () => {
  let threw = false;
  try {
    appIdFromConnection(undefined);
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("App ID"), true);
  }
  assertEquals(threw, true);
});
