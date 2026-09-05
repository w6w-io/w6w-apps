import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  baseUrlFromConnection,
  compact,
  csv,
  ErpNextClient,
  json,
  METHOD_PATH,
  normalizeBaseUrl,
  RESOURCE_PATH,
  toFilters,
  unwrapError,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

Deno.test("the resource and method paths are what the docs state", () => {
  assertEquals(RESOURCE_PATH, "/api/resource");
  assertEquals(METHOD_PATH, "/api/method");
});

/** A missing scheme must not downgrade an API Secret in flight to plaintext. */
Deno.test("normalizeBaseUrl assumes https and strips everything past the origin", () => {
  assertEquals(normalizeBaseUrl("erpnext.example.com"), "https://erpnext.example.com");
  assertEquals(normalizeBaseUrl("https://erpnext.example.com/"), "https://erpnext.example.com");
  assertEquals(
    normalizeBaseUrl("https://erpnext.example.com/api/resource/Customer"),
    "https://erpnext.example.com",
  );
  assertEquals(normalizeBaseUrl("http://localhost:8000"), "http://localhost:8000");
});

Deno.test("normalizeBaseUrl refuses something that is not a URL", () => {
  assertThrows(() => normalizeBaseUrl(""), Error, "ERPNext site URL is empty");
  assertThrows(() => normalizeBaseUrl("http://"), Error, "not a valid URL");
});

Deno.test("baseUrlFromConnection explains itself when the URL was never stored", () => {
  assertEquals(baseUrlFromConnection(conn as never), "https://erpnext.example.com");
  assertThrows(
    () => baseUrlFromConnection({ display: {} } as never),
    Error,
    "records no site URL",
  );
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(json(undefined, "x"), undefined);
  assertEquals(json({ a: 1 }, "x"), { a: 1 });
});

Deno.test("toFilters accepts the documented array shape and an equality object", () => {
  assertEquals(toFilters('[["status","=","Open"]]', "Filters"), [["status", "=", "Open"]]);
  assertEquals(toFilters({ status: "Open" }, "Filters"), { status: "Open" });
  assertEquals(toFilters(undefined, "Filters"), undefined);
  assertThrows(() => toFilters('"just a string"', "Filters"), Error, "must be a JSON array");
});

/** _server_messages is the primary, human-authored shape frappe/utils/response.py emits. */
Deno.test("unwrapError prefers _server_messages, then exception, then message", () => {
  const serverMessages = JSON.stringify([
    JSON.stringify({ message: "Customer is mandatory", title: "Missing" }),
  ]);
  assertEquals(
    unwrapError(417, JSON.stringify({ _server_messages: serverMessages })),
    "Customer is mandatory",
  );
  assertEquals(
    unwrapError(500, JSON.stringify({ exception: "frappe.exceptions.ValidationError: bad" })),
    "frappe.exceptions.ValidationError: bad",
  );
  assertEquals(
    unwrapError(403, JSON.stringify({ exc_type: "PermissionError" })),
    "PermissionError",
  );
  assertEquals(unwrapError(500, JSON.stringify({ message: "custom message" })), "custom message");
  assertEquals(unwrapError(500, "not json at all"), "not json at all");
  assertEquals(unwrapError(500, ""), "HTTP 500");
});

Deno.test("client: resource() builds paths on the connection's site, under /api/resource", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ name: "CUST-0001" }] } }], conn);
  await new ErpNextClient(ctx).resource("/Customer");
  assertEquals(calls[0].url, "https://erpnext.example.com/api/resource/Customer");
});

Deno.test("client: never sends Authorization — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], conn);
  await new ErpNextClient(ctx).resource("/Customer/CUST-0001");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a failure surfaces the status and the unwrapped body", async () => {
  const serverMessages = JSON.stringify([JSON.stringify({ message: "No permission" })]);
  const { ctx } = mockCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { _server_messages: serverMessages },
  }], conn);
  let threw: Error | undefined;
  try {
    await new ErpNextClient(ctx).resource("/Customer/CUST-0001");
  } catch (err) {
    threw = err as Error;
  }
  assert(threw, "expected a rejection");
  assert(threw!.message.includes("403"), threw!.message);
  assert(threw!.message.includes("No permission"), threw!.message);
});

Deno.test("client: a connection with no URL fails before any request", () => {
  const { ctx } = mockCtx([], { display: {} });
  assertThrows(() => new ErpNextClient(ctx), Error, "records no site URL");
});

Deno.test("client: method() calls /api/method and unwraps {message: ...}", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { message: "administrator@example.com" } }],
    conn,
  );
  const result = await new ErpNextClient(ctx).method<string>("frappe.auth.get_logged_user");
  assertEquals(calls[0].url, "https://erpnext.example.com/api/method/frappe.auth.get_logged_user");
  assertEquals(result, "administrator@example.com");
});

Deno.test("client: query values are JSON-encoded except plain strings", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await new ErpNextClient(ctx).resource("/Customer", {
    query: { fields: ["name", "customer_name"], limit_page_length: 5, order_by: "modified desc" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), '["name","customer_name"]');
  assertEquals(url.searchParams.get("limit_page_length"), "5");
  assertEquals(url.searchParams.get("order_by"), "modified desc");
});
