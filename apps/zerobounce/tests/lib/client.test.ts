import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { formatZeroBounceError, hostFor, ZeroBounceClient } from "../../lib/client.ts";

Deno.test("hostFor: maps region names to hosts, defaulting to the global host", () => {
  assertEquals(hostFor(undefined), "api.zerobounce.net");
  assertEquals(hostFor("default"), "api.zerobounce.net");
  assertEquals(hostFor("us"), "api-us.zerobounce.net");
  assertEquals(hostFor("eu"), "api-eu.zerobounce.net");
  // An unrecognized value falls back to the default rather than throwing.
  assertEquals(hostFor("nope"), "api.zerobounce.net");
});

Deno.test("formatZeroBounceError: reads the flat {error} shape", () => {
  const msg = formatZeroBounceError(200, "/v2/validate", { error: "bad key" });
  assert(msg.includes("bad key"));
  assert(msg.includes("/v2/validate"));
});

Deno.test("formatZeroBounceError: reads the {errors:[...]} batch shape", () => {
  const msg = formatZeroBounceError(200, "/v2/validatebatch", {
    email_batch: [],
    errors: [{ error: "Invalid API Key or your account ran out of credits", email_address: "all" }],
  });
  assert(msg.includes("all"));
  assert(msg.includes("Invalid API Key"));
});

Deno.test("ZeroBounceClient.request: builds the URL against the default host and query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { Credits: 100 } }]);
  const client = new ZeroBounceClient(ctx);
  const result = await client.request("/v2/getcredits", { query: { api_key: "x" } });

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.zerobounce.net");
  assertEquals(url.pathname, "/v2/getcredits");
  assertEquals(url.searchParams.get("api_key"), "x");
  assertEquals(result, { Credits: 100 });
});

Deno.test("ZeroBounceClient.request: honors the region option", async () => {
  const { ctx, calls } = mockCtx([{ body: { Credits: 100 } }]);
  const client = new ZeroBounceClient(ctx);
  await client.request("/v2/getcredits", { region: "eu" });
  assertEquals(new URL(calls[0].url).host, "api-eu.zerobounce.net");
});

Deno.test("ZeroBounceClient.request: sends a JSON body with content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ body: { email_batch: [], errors: [] } }]);
  const client = new ZeroBounceClient(ctx);
  await client.request("/v2/validatebatch", { method: "POST", body: { email_batch: [] } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { email_batch: [] });
});

Deno.test("ZeroBounceClient.request: throws on a non-2xx status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const client = new ZeroBounceClient(ctx);
  await assertRejects(() => client.request("/v2/getcredits"), Error, "500");
});

Deno.test("ZeroBounceClient.request: throws on the flat {error} body even when res.ok is true", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { error: "Invalid API Key or your account ran out of credits" },
  }]);
  const client = new ZeroBounceClient(ctx);
  await assertRejects(
    () => client.request("/v2/validate"),
    Error,
    "Invalid API Key",
  );
});

Deno.test("ZeroBounceClient.request: does NOT throw on a validatebatch partial-failure envelope", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      email_batch: [{ address: "a@example.com", status: "valid" }],
      errors: [{ error: "some per-item failure", email_address: "b@example.com" }],
    },
  }]);
  const client = new ZeroBounceClient(ctx);
  const result = await client.request("/v2/validatebatch", { method: "POST", body: {} }) as {
    email_batch: unknown[];
    errors: unknown[];
  };
  assertEquals(result.email_batch.length, 1);
  assertEquals(result.errors.length, 1);
});
