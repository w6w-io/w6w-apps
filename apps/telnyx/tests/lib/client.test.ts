import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_BASE, describeTelnyxErrors, TelnyxClient } from "../../lib/client.ts";

Deno.test("API_BASE: the servers[0].url from the OpenAPI document", () => {
  assertEquals(API_BASE, "https://api.telnyx.com/v2");
});

Deno.test("client: GETs with no body and no content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "1" } } }]);
  await new TelnyxClient(ctx).data("/messages/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.telnyx.com/v2/messages/1");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
});

/**
 * The one guarantee the whole app rests on: nothing in the client builds an
 * `Authorization` header. Only the auth `sign` hook is handed the credential.
 */
Deno.test("client: never sends an Authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new TelnyxClient(ctx).request("/phone_numbers");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: POSTs JSON with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "1" } } }]);
  await new TelnyxClient(ctx).data("/messages", {
    method: "POST",
    body: { to: "+1", text: "hi" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { to: "+1", text: "hi" });
});

Deno.test("client: drops undefined, null and empty-string query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new TelnyxClient(ctx).request("/phone_numbers", {
    query: { "page[size]": 10, "page[number]": undefined, "filter[status]": null, x: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page[size]"), "10");
  assertEquals(url.searchParams.has("page[number]"), false);
  assertEquals(url.searchParams.has("filter[status]"), false);
  assertEquals(url.searchParams.has("x"), false);
});

Deno.test("client: bracketed deepObject query keys survive round-trip encoding", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new TelnyxClient(ctx).request("/phone_numbers", {
    query: { "filter[phone_number]": "+14155551212" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[phone_number]"), "+14155551212");
});

Deno.test("client: data() unwraps the {data: ...} envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { id: "abc" } } }]);
  const result = await new TelnyxClient(ctx).data("/messages/abc");
  assertEquals(result, { id: "abc" });
});

Deno.test("client: request() returns the full envelope, meta included", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ id: "1" }], meta: { total_results: 1 } },
  }]);
  const result = await new TelnyxClient(ctx).request("/phone_numbers");
  assertEquals(result, { data: [{ id: "1" }], meta: { total_results: 1 } });
});

/*
 * ── errors ───────────────────────────────────────────────────────────────────
 */

Deno.test("describeTelnyxErrors: renders code, title and detail", () => {
  const rendered = describeTelnyxErrors({
    errors: [{ code: "10009", title: "Authentication failed", detail: "bad creds" }],
  });
  assertEquals(rendered, "#10009 Authentication failed bad creds");
});

Deno.test("describeTelnyxErrors: returns undefined for a body with no errors array", () => {
  assertEquals(describeTelnyxErrors({}), undefined);
  assertEquals(describeTelnyxErrors(undefined), undefined);
  assertEquals(describeTelnyxErrors({ errors: [] }), undefined);
});

Deno.test("client: a non-2xx throws with the vendor's structured error message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: [{ code: "40010", title: "Invalid parameter", detail: "`to` is required" }] },
  }]);
  await assertRejects(
    () => new TelnyxClient(ctx).request("/messages", { method: "POST", body: {} }),
    Error,
    "#40010",
  );
});

Deno.test("client: a non-2xx with an unreadable body still throws, naming the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "", statusText: "Internal Server Error" }]);
  const err = await assertRejects(
    () => new TelnyxClient(ctx).request("/messages"),
    Error,
  );
  assert(err.message.includes("500"), err.message);
});
