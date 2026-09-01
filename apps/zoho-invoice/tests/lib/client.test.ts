import { assertEquals, assertThrows } from "@std/assert";
import {
  apiHostFromConnection,
  compact,
  formatInvoiceError,
  ORG_ID_HEADER,
  organizationIdFrom,
  parseFields,
  unwrapResource,
  ZohoInvoiceClient,
} from "../../lib/client.ts";
import { mockInvoiceCtx } from "../_helpers.ts";

Deno.test("apiHostFromConnection: reads the recorded region host", () => {
  assertEquals(
    apiHostFromConnection({ display: { apiHost: "www.zohoapis.eu" } } as never),
    "www.zohoapis.eu",
  );
});

Deno.test("apiHostFromConnection: falls back to the US host when unrecorded", () => {
  assertEquals(apiHostFromConnection(undefined), "www.zohoapis.com");
});

Deno.test("organizationIdFrom: prefers the explicit input over the connection default", () => {
  const { ctx } = mockInvoiceCtx([], "www.zohoapis.com", "111");
  assertEquals(organizationIdFrom({ organizationId: "222" }, ctx), "222");
});

Deno.test("organizationIdFrom: falls back to the connection's recorded organization id", () => {
  const { ctx } = mockInvoiceCtx([], "www.zohoapis.com", "111");
  assertEquals(organizationIdFrom({}, ctx), "111");
});

Deno.test("organizationIdFrom: throws with an actionable message when neither is set", () => {
  const { ctx } = mockCtxNoOrg();
  assertThrows(() => organizationIdFrom({}, ctx), Error, "List Organizations");
});

function mockCtxNoOrg() {
  return mockInvoiceCtx([], "www.zohoapis.com", "");
}

Deno.test("formatInvoiceError: includes the vendor code and message", () => {
  const msg = formatInvoiceError(
    401,
    "GET",
    "/invoice/v3/organizations",
    JSON.stringify({ code: 57, message: "You are not authorized to perform this operation" }),
  );
  assertEquals(
    msg,
    "Zoho Invoice 401 (code 57) for GET /invoice/v3/organizations: You are not authorized to perform this operation",
  );
});

Deno.test("formatInvoiceError: falls back to the raw body when it is not JSON", () => {
  const msg = formatInvoiceError(500, "GET", "/invoice/v3/invoices", "<html>oops</html>");
  assertEquals(msg, "Zoho Invoice 500 for GET /invoice/v3/invoices: <html>oops</html>");
});

Deno.test("unwrapResource: pulls the named key out of the envelope", () => {
  const out = unwrapResource<{ id: string }>(
    { code: 0, message: "success", contact: { id: "1" } },
    "contact",
  );
  assertEquals(out, { id: "1" });
});

Deno.test("unwrapResource: throws when the key is absent", () => {
  assertThrows(
    () => unwrapResource({ code: 0, message: "success" }, "contact"),
    Error,
    'no "contact" key',
  );
});

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("parseFields: parses a JSON string and rejects non-objects", () => {
  assertEquals(parseFields('{"a":1}'), { a: 1 });
  assertThrows(() => parseFields(undefined), Error, "required");
  assertThrows(() => parseFields("[1,2]"), Error, "JSON object");
});

Deno.test("ZohoInvoiceClient: builds the request against the connection's region host and stamps the org header, not a query param", async () => {
  const { ctx, calls } = mockInvoiceCtx(
    [
      { body: { code: 0, message: "success", contact: { contact_id: "1" } } },
    ],
    "www.zohoapis.eu",
    "999",
  );
  const body = await new ZohoInvoiceClient(ctx).request("/contacts", {
    method: "POST",
    organizationId: "999",
    body: { contact_name: "Acme" },
  });
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "www.zohoapis.eu");
  assertEquals(url.pathname, "/invoice/v3/contacts");
  assertEquals(url.searchParams.has("organization_id"), false);
  assertEquals(calls[0].headers[ORG_ID_HEADER.toLowerCase()], "999");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { contact_name: "Acme" });
  assertEquals(body, { code: 0, message: "success", contact: { contact_id: "1" } });
});

Deno.test("ZohoInvoiceClient: omits the org header when none is given (the /organizations discovery call)", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", organizations: [] } },
  ]);
  await new ZohoInvoiceClient(ctx).request("/organizations");
  assertEquals(calls[0].headers[ORG_ID_HEADER.toLowerCase()], undefined);
});

Deno.test("ZohoInvoiceClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockInvoiceCtx([
    { status: 400, body: { code: 1002, message: "Invoice does not exist." } },
  ]);
  await assertRejectsWithMessage(
    () => new ZohoInvoiceClient(ctx).request("/invoices/9", { organizationId: "111" }),
    "Zoho Invoice 400 (code 1002)",
  );
});

async function assertRejectsWithMessage(fn: () => Promise<unknown>, needle: string) {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes(needle)) throw e;
  }
}
