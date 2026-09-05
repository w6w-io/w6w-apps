import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, TEST_API_BASE } from "../_helpers.ts";
import {
  apiBaseOf,
  DEFAULT_API_BASE,
  normalizeApiBase,
  SimplybookClient,
  SimplybookError,
} from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new SimplybookClient(ctx, TEST_API_BASE);
  const result = await client.request("/admin/bookings/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a SimplybookError carrying the vendor's flat error shape", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { code: 400, message: "Invalid company", data: [], message_data: [] } },
  ]);
  const client = new SimplybookClient(ctx, TEST_API_BASE);
  const err = await assertRejects(
    () => client.request("/admin/bookings/999"),
    SimplybookError,
    "Invalid company",
  );
  assertEquals(err.status, 400);
  assertEquals(err.code, 400);
});

Deno.test("client: flags a 419 response as a token-expired condition in the message", async () => {
  const { ctx } = mockCtx([{ status: 419, statusText: "Token Expired" }]);
  const client = new SimplybookClient(ctx, TEST_API_BASE);
  await assertRejects(
    () => client.request("/admin/bookings"),
    SimplybookError,
    "token expired",
  );
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new SimplybookClient(ctx, TEST_API_BASE);
  await client.request("/admin/clients", {
    query: { "filter[search]": "kept", "filter[client_id]": undefined },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[search]"), "kept");
  assertEquals(url.searchParams.has("filter[client_id]"), false);
});

Deno.test("client: serializes array query params as repeated bracketed pairs", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new SimplybookClient(ctx, TEST_API_BASE);
  await client.request("/admin/bookings", {
    query: { "filter[services]": [10, 20] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("filter[services][]"), ["10", "20"]);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new SimplybookClient(ctx, TEST_API_BASE);
  await client.request("/admin/bookings", {
    method: "POST",
    body: { service_id: 1, provider_id: 2, client_id: 3 },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { service_id: 1, provider_id: 2, client_id: 3 });
});

Deno.test("client: never sets X-Company-Login or X-Token (sign does)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new SimplybookClient(ctx, TEST_API_BASE).request("/admin/services");
  assertEquals(calls[0].headers["x-company-login"], undefined);
  assertEquals(calls[0].headers["x-token"], undefined);
});

Deno.test("client: builds requests against the given API base", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new SimplybookClient(ctx, TEST_API_BASE).request("/admin/services");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, TEST_API_BASE);
  assertEquals(url.pathname, "/admin/services");
});

Deno.test("normalizeApiBase: blank input defaults to the global server", () => {
  assertEquals(normalizeApiBase(undefined), DEFAULT_API_BASE);
  assertEquals(normalizeApiBase(""), DEFAULT_API_BASE);
});

Deno.test("normalizeApiBase: accepts every server the OpenAPI document publishes", () => {
  assertEquals(
    normalizeApiBase("https://user-api-v2.simplybook.it"),
    "https://user-api-v2.simplybook.it",
  );
  assertEquals(
    normalizeApiBase("https://user-api-v2.simplybook.it/"),
    "https://user-api-v2.simplybook.it",
  );
});

Deno.test("normalizeApiBase: refuses an arbitrary host rather than widening egress silently", () => {
  assertThrows(() => normalizeApiBase("https://evil.example"), Error, "not one of the servers");
});

Deno.test("normalizeApiBase: refuses an unparseable URL", () => {
  assertThrows(() => normalizeApiBase("not a url"), Error, "not a valid URL");
});

Deno.test("apiBaseOf: falls back to the default when the connection has no display", () => {
  assertEquals(apiBaseOf(undefined), DEFAULT_API_BASE);
  assertEquals(
    apiBaseOf({
      id: "c",
      app: "io.w6w.simplybook",
      auth: "login",
      owner: "u",
      state: "connected",
      createdAt: "2026-09-05T00:00:00Z",
    }),
    DEFAULT_API_BASE,
  );
});

Deno.test("apiBaseOf: reads the connection's echoed apiBase", () => {
  assertEquals(
    apiBaseOf({
      id: "c",
      app: "io.w6w.simplybook",
      auth: "login",
      owner: "u",
      state: "connected",
      createdAt: "2026-09-05T00:00:00Z",
      display: { apiBase: "https://user-api-v2.simplybook.asia" },
    }),
    "https://user-api-v2.simplybook.asia",
  );
});
