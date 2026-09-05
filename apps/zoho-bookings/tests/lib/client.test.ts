import { assertEquals, assertThrows } from "@std/assert";
import {
  apiHostFromConnection,
  compact,
  formatBookingsError,
  unwrapReturnValue,
  unwrapStaffAddResult,
  workspaceIdFrom,
  ZohoBookingsClient,
} from "../../lib/client.ts";
import { mockBookingsCtx, mockCtx } from "../_helpers.ts";

Deno.test("apiHostFromConnection: reads the recorded region host", () => {
  assertEquals(
    apiHostFromConnection({ display: { apiHost: "www.zohoapis.eu" } } as never),
    "www.zohoapis.eu",
  );
});

Deno.test("apiHostFromConnection: falls back to the US host when unrecorded", () => {
  assertEquals(apiHostFromConnection(undefined), "www.zohoapis.com");
});

Deno.test("workspaceIdFrom: prefers the explicit input over the connection default", () => {
  const { ctx } = mockBookingsCtx([], "www.zohoapis.com", "111");
  assertEquals(workspaceIdFrom({ workspaceId: "222" }, ctx), "222");
});

Deno.test("workspaceIdFrom: falls back to the connection's recorded workspace id", () => {
  const { ctx } = mockBookingsCtx([], "www.zohoapis.com", "111");
  assertEquals(workspaceIdFrom({}, ctx), "111");
});

Deno.test("workspaceIdFrom: throws with an actionable message when neither is set", () => {
  const { ctx } = mockBookingsCtx([], "www.zohoapis.com", "");
  assertThrows(() => workspaceIdFrom({}, ctx), Error, "List Workspaces");
});

Deno.test("formatBookingsError: reads the documented envelope's status/logMessage when present", () => {
  const msg = formatBookingsError(
    400,
    "GET",
    "/bookings/v1/json/services",
    "application/json",
    JSON.stringify({ response: { status: "failure", logMessage: ["workspace_id is required"] } }),
  );
  assertEquals(
    msg,
    'Zoho Bookings 400 for GET /bookings/v1/json/services: status="failure" ' +
      "(workspace_id is required)",
  );
});

Deno.test("formatBookingsError: falls back to the raw (often HTML) body when it is not the envelope", () => {
  const msg = formatBookingsError(
    401,
    "GET",
    "/bookings/v1/json/workspaces",
    "text/html;charset=UTF-8",
    "<html>Something went wrong</html>",
  );
  assertEquals(
    msg,
    "Zoho Bookings 401 for GET /bookings/v1/json/workspaces: <html>Something went wrong</html>",
  );
});

Deno.test("formatBookingsError: truncates a long non-JSON body", () => {
  const msg = formatBookingsError(500, "GET", "/x", "text/html", "a".repeat(400));
  assertEquals(msg.includes("… (400 bytes, content-type text/html)"), true);
});

Deno.test("unwrapReturnValue: pulls returnvalue out of a success envelope", () => {
  const out = unwrapReturnValue<{ data: string[] }>(
    { response: { status: "success", returnvalue: { data: ["a"] } } },
    "GET",
    "/bookings/v1/json/workspaces",
  );
  assertEquals(out, { data: ["a"] });
});

Deno.test("unwrapReturnValue: throws when status is not success", () => {
  assertThrows(
    () =>
      unwrapReturnValue(
        { response: { status: "failure", logMessage: ["bad input"] } },
        "GET",
        "/bookings/v1/json/workspaces",
      ),
    Error,
    'status "failure" (bad input)',
  );
});

Deno.test("unwrapReturnValue: throws when returnvalue is absent even on success", () => {
  assertThrows(
    () => unwrapReturnValue({ response: { status: "success" } }, "GET", "/x"),
    Error,
    'no "returnvalue"',
  );
});

Deno.test("unwrapStaffAddResult: returns the first item when its status is success", () => {
  const out = unwrapStaffAddResult(
    { response: [{ id: "1", name: "Test1", email: "t@t.com", status: "success" }] },
    "POST",
    "/bookings/v1/json/addstaff",
  );
  assertEquals(out.id, "1");
});

Deno.test("unwrapStaffAddResult: throws the vendor's per-item message on a 2xx business failure", () => {
  assertThrows(
    () =>
      unwrapStaffAddResult(
        { response: [{ status: "Staff already exists" }] },
        "POST",
        "/bookings/v1/json/addstaff",
      ),
    Error,
    "Staff already exists",
  );
});

Deno.test("unwrapStaffAddResult: throws when the response array is empty", () => {
  assertThrows(
    () => unwrapStaffAddResult({ response: [] }, "POST", "/x"),
    Error,
    "carried no result",
  );
});

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("ZohoBookingsClient: builds the request against the connection's region host and query", async () => {
  const { ctx, calls } = mockBookingsCtx(
    [{ body: { response: { status: "success", returnvalue: { data: [] } } } }],
    "www.zohoapis.eu",
    "999",
  );
  const body = await new ZohoBookingsClient(ctx).request("/services", {
    query: { workspace_id: "999" },
  });
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "www.zohoapis.eu");
  assertEquals(url.pathname, "/bookings/v1/json/services");
  assertEquals(url.searchParams.get("workspace_id"), "999");
  assertEquals(calls[0].method, "GET");
  assertEquals(body, { response: { status: "success", returnvalue: { data: [] } } });
});

Deno.test("ZohoBookingsClient: sends a FormData body for a write call, untouched by JSON headers", async () => {
  const { ctx, calls } = mockBookingsCtx([
    { body: { response: { status: "success", returnvalue: { booking_id: "#AN-1" } } } },
  ]);
  const form = new FormData();
  form.append("service_id", "1");
  form.append("from_time", "30-Apr-2030 10:00:00");
  await new ZohoBookingsClient(ctx).request("/appointment", { method: "POST", form });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].form, { service_id: "1", from_time: "30-Apr-2030 10:00:00" });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("ZohoBookingsClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      headers: { "content-type": "text/html;charset=UTF-8" },
      body: "<html>Something went wrong</html>",
    },
  ]);
  (ctx as { connection?: unknown }).connection = {
    display: { apiHost: "www.zohoapis.com" },
  };
  await assertRejectsWithMessage(
    () => new ZohoBookingsClient(ctx).request("/workspaces"),
    "Zoho Bookings 401 for GET /bookings/v1/json/workspaces: <html>Something went wrong</html>",
  );
});

Deno.test("ZohoBookingsClient: an empty body on success resolves to undefined, not a parse error", async () => {
  const { ctx } = mockBookingsCtx([{ body: undefined }]);
  const body = await new ZohoBookingsClient(ctx).request("/workspaces");
  assertEquals(body, undefined);
});

async function assertRejectsWithMessage(fn: () => Promise<unknown>, needle: string) {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes(needle)) throw e;
  }
}
