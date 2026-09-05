import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import {
  basicAuthHeader,
  formatTicketTailorError,
  nextCursor,
  TicketTailorClient,
  toFormBody,
  toList,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("basicAuthHeader: base64(key + ':') — RFC 7617 basic, not base64(key) alone", () => {
  // base64("sk_test_123:") computed independently.
  assertEquals(basicAuthHeader("sk_test_123"), "Basic c2tfdGVzdF8xMjM6");
});

Deno.test("toFormBody: scalars, arrays as key[], objects as key[subkey], drops empty", () => {
  const body = toFormBody({
    name: "Test discount",
    price: 540,
    active: true,
    ticket_types: ["tt_1", "tt_2"],
    ticket_type_id: { tt_1: 1, tt_2: 0 },
    skip_undefined: undefined,
    skip_null: null,
    skip_empty: "",
  });
  const parts = new URLSearchParams(body);
  assertEquals(parts.get("name"), "Test discount");
  assertEquals(parts.get("price"), "540");
  assertEquals(parts.get("active"), "true");
  assertEquals(parts.getAll("ticket_types[]"), ["tt_1", "tt_2"]);
  assertEquals(parts.get("ticket_type_id[tt_1]"), "1");
  assertEquals(parts.get("ticket_type_id[tt_2]"), "0");
  assertEquals(parts.has("skip_undefined"), false);
  assertEquals(parts.has("skip_null"), false);
  assertEquals(parts.has("skip_empty"), false);
});

Deno.test("toList: parses comma strings and passes through arrays", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("nextCursor: pulls starting_after/ending_before out of a links URL", () => {
  assertEquals(nextCursor("/v1/orders?starting_after=or_223"), "or_223");
  assertEquals(nextCursor("/v1/orders?ending_before=or_100"), "or_100");
  assertEquals(nextCursor(null), undefined);
  assertEquals(nextCursor(undefined), undefined);
});

Deno.test("formatTicketTailorError: surfaces error_code, message, hint and field errors", () => {
  const raw = JSON.stringify({
    status: 400,
    error_code: "VALIDATION_ERROR",
    message: "One or more fields failed validation",
    errors: [{ field: "name", messages: ["Value is required and can't be empty"] }],
  });
  const msg = formatTicketTailorError(400, "POST", "/v1/discounts", raw);
  assertMatch(msg, /VALIDATION_ERROR/);
  assertMatch(msg, /name: Value is required/);
});

Deno.test("formatTicketTailorError: falls back to raw body when not JSON", () => {
  const msg = formatTicketTailorError(500, "GET", "/v1/orders", "<html>oops</html>");
  assertMatch(msg, /500/);
  assertMatch(msg, /oops/);
});

Deno.test("TicketTailorClient.request: builds the URL, query, and parses JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const client = new TicketTailorClient(ctx);
  const result = await client.request("/events", { query: { limit: 5, status: "" } });
  assertEquals(result, { data: [] });
  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/v1/events");
  assertEquals(queryOf(calls[0].url), { limit: "5" });
});

Deno.test("TicketTailorClient.request: sends form bodies as application/x-www-form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "es_1" } }]);
  const client = new TicketTailorClient(ctx);
  await client.request("/event_series", { method: "POST", form: { name: "Test" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "name=Test");
});

Deno.test("TicketTailorClient.request: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody("FORBIDDEN", "You do not have permission to perform the request."),
    },
  ]);
  const client = new TicketTailorClient(ctx);
  await assertRejects(
    () => client.request("/overview"),
    Error,
    "FORBIDDEN",
  );
});
