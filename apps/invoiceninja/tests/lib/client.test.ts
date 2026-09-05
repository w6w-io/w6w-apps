import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  baseUrlFromConnection,
  compact,
  errorMessage,
  InvoiceNinjaClient,
  jsonArray,
  normalizeBaseUrl,
  unset,
} from "../../lib/client.ts";
import { mockNinjaCtx } from "../_helpers.ts";

Deno.test("normalizeBaseUrl: adds https:// when no scheme is given", () => {
  assertEquals(normalizeBaseUrl("invoicing.co"), "https://invoicing.co");
});

Deno.test("normalizeBaseUrl: strips a trailing path", () => {
  assertEquals(normalizeBaseUrl("https://acme.invoicing.co/api/v1"), "https://acme.invoicing.co");
});

Deno.test("normalizeBaseUrl: strips a trailing slash", () => {
  assertEquals(normalizeBaseUrl("https://invoicing.co/"), "https://invoicing.co");
});

Deno.test("normalizeBaseUrl: throws on an empty string", () => {
  assertThrows(() => normalizeBaseUrl(""));
});

Deno.test("normalizeBaseUrl: throws on an unparsable URL", () => {
  assertThrows(() => normalizeBaseUrl("https://"));
});

Deno.test("baseUrlFromConnection: throws when the connection records no baseUrl", () => {
  assertThrows(() => baseUrlFromConnection(undefined));
  assertThrows(() =>
    baseUrlFromConnection({
      id: "c",
      app: "io.w6w.invoiceninja",
      auth: "api-token",
      owner: "usr_1",
      state: "connected",
      createdAt: "2026-09-05T00:00:00.000Z",
      display: {},
    })
  );
});

Deno.test("unset: blank string becomes undefined, non-blank passes through", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("hi"), "hi");
  assertEquals(unset(undefined), undefined);
});

Deno.test("compact: drops only undefined keys, keeps null/empty/zero", () => {
  assertEquals(compact({ a: undefined, b: null, c: 0, d: "", e: "x" }), {
    b: null,
    c: 0,
    d: "",
    e: "x",
  });
});

Deno.test("jsonArray: parses a JSON string and passes an array through", () => {
  assertEquals(jsonArray('[{"a":1}]', "lineItems"), [{ a: 1 }]);
  assertEquals(jsonArray([{ a: 1 }], "lineItems"), [{ a: 1 }]);
});

Deno.test("jsonArray: unset input is an empty array", () => {
  assertEquals(jsonArray(undefined, "lineItems"), []);
  assertEquals(jsonArray("", "lineItems"), []);
});

Deno.test("jsonArray: throws a named error when the value is not an array", () => {
  assertThrows(() => jsonArray('{"a":1}', "lineItems"), Error, "`lineItems` must be a JSON array.");
});

Deno.test("errorMessage: folds message + per-field errors", () => {
  assertEquals(
    errorMessage({ message: "The given data was invalid.", errors: { amount: ["required"] } }),
    "The given data was invalid. (amount: required)",
  );
  assertEquals(errorMessage({ message: "Invalid token" }), "Invalid token");
  assertEquals(errorMessage({}), undefined);
});

Deno.test("InvoiceNinjaClient: builds URLs under /api/v1 and sends X-Requested-With", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "abc" } }]);
  await new InvoiceNinjaClient(ctx).request("/clients/abc");
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/clients/abc");
  assertEquals(calls[0].headers["x-requested-with"], "XMLHttpRequest");
  // The client never sets the credential header itself — `sign` does that.
  assertEquals("x-api-token" in calls[0].headers, false);
});

Deno.test("InvoiceNinjaClient: drops blank/undefined query values", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await new InvoiceNinjaClient(ctx).request("/clients", {
    query: { name: "bob", status: undefined, page: 1, empty: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("name"), "bob");
  assertEquals(url.searchParams.has("status"), false);
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.has("empty"), false);
});

Deno.test("InvoiceNinjaClient: surfaces the vendor's own message on error", async () => {
  const { ctx } = mockNinjaCtx([{
    status: 422,
    body: { message: "The given data was invalid.", errors: { amount: ["required"] } },
  }]);
  await assertRejects(
    () => new InvoiceNinjaClient(ctx).request("/payments", { method: "POST", body: {} }),
    Error,
    "The given data was invalid. (amount: required)",
  );
});

Deno.test("InvoiceNinjaClient: a 204 or empty body resolves to undefined", async () => {
  const { ctx } = mockNinjaCtx([{ status: 204 }]);
  assertEquals(
    await new InvoiceNinjaClient(ctx).request("/clients/abc", { method: "DELETE" }),
    undefined,
  );
});
