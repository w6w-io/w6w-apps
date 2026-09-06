import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockBooqableCtx, mockCtx } from "../_helpers.ts";
import {
  BooqableClient,
  compact,
  companySlugFromConnection,
  errorMessage,
  jsonApiBody,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's company slug, not a param", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: { id: "1" } } }], "acme");
  await new BooqableClient(ctx).request("/customers/1");
  assertEquals(calls[0].url, "https://acme.booqable.com/api/4/customers/1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no company slug", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new BooqableClient(ctx), Error, "no company slug");
});

Deno.test("client: percent-encodes bracketed query keys", async () => {
  const { ctx, calls } = mockBooqableCtx([{ body: { data: [] } }]);
  await new BooqableClient(ctx).request("/customers", {
    query: { "filter[status][eq]": "reserved", "page[number]": 2 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[status][eq]"), "reserved");
  assertEquals(url.searchParams.get("page[number]"), "2");
});

Deno.test("client: surfaces Booqable's own error title+detail, not just the status", async () => {
  const { ctx } = mockBooqableCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: {
      errors: [{
        code: "items_not_available",
        title: "Items not available",
        detail: "One or more items are not available",
      }],
    },
  }]);
  await assertRejects(
    () => new BooqableClient(ctx).request("/orders", { method: "POST", body: {} }),
    Error,
    "Items not available: One or more items are not available",
  );
});

Deno.test("client: falls back to the raw body when the error isn't JSON", async () => {
  const { ctx } = mockBooqableCtx([{ status: 500, body: "internal error" }]);
  await assertRejects(
    () => new BooqableClient(ctx).request("/customers/1"),
    Error,
    "internal error",
  );
});

Deno.test("client: returns an empty envelope for a bodyless response", async () => {
  const { ctx } = mockBooqableCtx([{ status: 200, body: undefined }]);
  assertEquals(await new BooqableClient(ctx).request("/customers/1"), {});
});

Deno.test("companySlugFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    companySlugFromConnection({ display: { companySlug: "acme" } } as never),
    "acme",
  );
  assertThrows(() => companySlugFromConnection(undefined), Error, "no company slug");
});

Deno.test("compact: drops undefined and empty-string values, keeps false/0/null", () => {
  assertEquals(
    compact({ a: undefined, b: "", c: false, d: 0, e: null, f: "keep" }),
    { c: false, d: 0, e: null, f: "keep" },
  );
});

Deno.test("jsonApiBody: builds a create document without an id", () => {
  assertEquals(
    jsonApiBody("customers", { name: "Jo", email: undefined }),
    { data: { type: "customers", attributes: { name: "Jo" } } },
  );
});

Deno.test("jsonApiBody: builds an update document with an id", () => {
  assertEquals(
    jsonApiBody("customers", { name: "Jo" }, "cust-1"),
    { data: { type: "customers", id: "cust-1", attributes: { name: "Jo" } } },
  );
});

Deno.test("errorMessage: joins title and detail from the errors array", () => {
  assertEquals(
    errorMessage(
      JSON.stringify({ errors: [{ title: "Wrong status", detail: "Can't transition" }] }),
    ),
    "Wrong status: Can't transition",
  );
});

Deno.test("errorMessage: falls back to the raw text when not JSON", () => {
  assertEquals(errorMessage("plain text failure"), "plain text failure");
});

Deno.test("errorMessage: returns empty string for an empty body", () => {
  assertEquals(errorMessage(""), "");
});
