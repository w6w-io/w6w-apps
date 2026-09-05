import { assertEquals, assertRejects } from "@std/assert";
import {
  apiHostFromConnection,
  compact,
  formatCalendarError,
  jsonParam,
  unwrapArray,
  unwrapFirst,
  ZohoCalendarClient,
} from "../../lib/client.ts";
import { mockCalendarCtx } from "../_helpers.ts";

Deno.test("apiHostFromConnection: falls back to the US host with no connection", () => {
  assertEquals(apiHostFromConnection(undefined), "calendar.zoho.com");
});

Deno.test("apiHostFromConnection: reads display.apiHost", () => {
  assertEquals(
    apiHostFromConnection(
      { display: { apiHost: "calendar.zoho.eu" } } as never,
    ),
    "calendar.zoho.eu",
  );
});

Deno.test("jsonParam: JSON-encodes an object, passes a string through unchanged", () => {
  assertEquals(jsonParam({ a: 1 }), '{"a":1}');
  assertEquals(jsonParam("already-a-string"), "already-a-string");
});

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("unwrapFirst: returns the first array entry", () => {
  assertEquals(unwrapFirst({ calendars: [{ uid: "1" }, { uid: "2" }] }, "calendars", "ctx"), {
    uid: "1",
  });
});

Deno.test("unwrapFirst: throws when the key is missing or empty", () => {
  let threw = false;
  try {
    unwrapFirst({ calendars: [] }, "calendars", "get calendar");
  } catch (e) {
    threw = true;
    assertEquals(
      (e as Error).message,
      'Zoho Calendar response for get calendar carried no "calendars" entries',
    );
  }
  assertEquals(threw, true);
});

Deno.test("unwrapArray: returns [] when the key is absent", () => {
  assertEquals(unwrapArray({}, "calendars"), []);
});

Deno.test("formatCalendarError: reads the vendor's error_code and description", () => {
  const raw = JSON.stringify({
    error: [{ description: "Invalid ticket.", error_code: "INVALID_TICKET" }],
  });
  const msg = formatCalendarError(400, "GET", "/api/v1/calendars", raw);
  assertEquals(
    msg,
    "Zoho Calendar 400 (INVALID_TICKET) for GET /api/v1/calendars: Invalid ticket.",
  );
});

Deno.test("formatCalendarError: falls back to the raw body when it isn't the documented shape", () => {
  const msg = formatCalendarError(500, "GET", "/api/v1/calendars", "upstream exploded");
  assertEquals(msg, "Zoho Calendar 500 for GET /api/v1/calendars: upstream exploded");
});

Deno.test("ZohoCalendarClient: builds the URL against this connection's regional host", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [] } }], "calendar.zoho.eu");
  await new ZohoCalendarClient(ctx).request("/calendars");
  const url = new URL(calls[0].url);
  assertEquals(url.host, "calendar.zoho.eu");
  assertEquals(url.pathname, "/api/v1/calendars");
});

Deno.test("ZohoCalendarClient: never sends an Authorization header itself", async () => {
  const { ctx, calls } = mockCalendarCtx([{ body: { calendars: [] } }]);
  await new ZohoCalendarClient(ctx).request("/calendars");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("ZohoCalendarClient: throws the vendor's error shape on a non-2xx response", async () => {
  const { ctx } = mockCalendarCtx([{
    status: 400,
    body: { error: [{ description: "Invalid ticket.", error_code: "INVALID_TICKET" }] },
  }]);
  await assertRejects(
    () => new ZohoCalendarClient(ctx).request("/calendars"),
    Error,
    "INVALID_TICKET",
  );
});
