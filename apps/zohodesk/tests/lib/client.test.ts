import { assertEquals, assertThrows } from "@std/assert";
import {
  apiHostFromConnection,
  base64ToBytes,
  compact,
  formatDeskError,
  orgIdFrom,
  parseFields,
  ZohoDeskClient,
} from "../../lib/client.ts";
import { mockDeskCtx } from "../_helpers.ts";

Deno.test("apiHostFromConnection: reads the recorded region host", () => {
  assertEquals(
    apiHostFromConnection({ display: { apiHost: "desk.zoho.eu" } } as never),
    "desk.zoho.eu",
  );
});

Deno.test("apiHostFromConnection: falls back to the US host when unrecorded", () => {
  assertEquals(apiHostFromConnection(undefined), "desk.zoho.com");
});

Deno.test("orgIdFrom: prefers the explicit input over the connection default", () => {
  const { ctx } = mockDeskCtx([], "desk.zoho.com", "111");
  assertEquals(orgIdFrom({ orgId: "222" }, ctx), "222");
});

Deno.test("orgIdFrom: falls back to the connection's recorded orgId", () => {
  const { ctx } = mockDeskCtx([], "desk.zoho.com", "111");
  assertEquals(orgIdFrom({}, ctx), "111");
});

Deno.test("orgIdFrom: throws with an actionable message when neither is set", () => {
  const { ctx } = mockDeskCtx([], "desk.zoho.com", "");
  assertThrows(() => orgIdFrom({}, ctx), Error, "List Organizations");
});

Deno.test("formatDeskError: includes the vendor errorCode and message", () => {
  const msg = formatDeskError(
    401,
    "GET",
    "/api/v1/organizations",
    JSON.stringify({
      errorCode: "INVALID_OAUTH",
      message: "The OAuth Token you provided is invalid.",
    }),
  );
  assertEquals(
    msg,
    "Zoho Desk 401 (INVALID_OAUTH) for GET /api/v1/organizations: The OAuth Token you provided is invalid.",
  );
});

Deno.test("formatDeskError: falls back to the raw body when it is not JSON", () => {
  const msg = formatDeskError(500, "GET", "/api/v1/tickets/9", "<html>oops</html>");
  assertEquals(msg, "Zoho Desk 500 for GET /api/v1/tickets/9: <html>oops</html>");
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

Deno.test("base64ToBytes: decodes back to the original bytes", () => {
  const buffer = base64ToBytes(btoa("hello"));
  assertEquals(new TextDecoder().decode(buffer), "hello");
});

Deno.test("base64ToBytes: strips a data: URL prefix before decoding", () => {
  const buffer = base64ToBytes(`data:text/plain;base64,${btoa("hi")}`);
  assertEquals(new TextDecoder().decode(buffer), "hi");
});

Deno.test("ZohoDeskClient: builds the request against the connection's region host, sends the orgId header and the body", async () => {
  const { ctx, calls } = mockDeskCtx(
    [{ body: { id: "1" } }],
    "desk.zoho.eu",
    "999",
  );
  const body = await new ZohoDeskClient(ctx).request("/contacts", {
    method: "POST",
    orgId: "999",
    body: { lastName: "Acme" },
  });
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "desk.zoho.eu");
  assertEquals(url.pathname, "/api/v1/contacts");
  assertEquals(calls[0].headers.orgid, "999");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { lastName: "Acme" });
  assertEquals(body, { id: "1" });
});

Deno.test("ZohoDeskClient: omits the orgId header when none is passed", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [] } }]);
  await new ZohoDeskClient(ctx).request("/organizations");
  assertEquals(calls[0].headers.orgid, undefined);
});

Deno.test("ZohoDeskClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockDeskCtx([
    {
      status: 404,
      body: { errorCode: "URL_NOT_FOUND", message: "The URL you requested could not be found." },
    },
  ]);
  await assertRejectsWithMessage(
    () => new ZohoDeskClient(ctx).request("/tickets/9", { orgId: "1" }),
    "Zoho Desk 404 (URL_NOT_FOUND)",
  );
});

Deno.test("ZohoDeskClient: a 204 with no body resolves to undefined", async () => {
  const { ctx } = mockDeskCtx([{ status: 204 }]);
  const body = await new ZohoDeskClient(ctx).request("/tickets/moveToTrash", {
    method: "POST",
    orgId: "1",
    body: { ticketIds: ["1"] },
  });
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
