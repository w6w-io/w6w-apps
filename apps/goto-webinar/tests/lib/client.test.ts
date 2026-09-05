import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_URL,
  formatGotoError,
  GotoWebinarClient,
  IDENTITY_URL,
  resolveOrganizerKey,
} from "../../lib/client.ts";
import { mockCtx, mockCtxWithOrganizer, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: API_URL and IDENTITY_URL are the vendor's verified base URLs", () => {
  assertEquals(API_URL, "https://api.getgo.com/G2W/rest/v2");
  assertEquals(IDENTITY_URL, "https://api.getgo.com/identity/v1");
});

Deno.test("client: request() builds the URL, method and JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { webinarKey: "1" } }]);
  const client = new GotoWebinarClient(ctx);
  const out = await client.request("/organizers/1/webinars", {
    method: "POST",
    query: { page: 0, size: undefined },
    body: { subject: "hi" },
  });

  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/1/webinars");
  assertEquals(queryOf(calls[0].url), { page: "0" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { subject: "hi" });
  assertEquals(out, { webinarKey: "1" });
});

Deno.test("client: request() returns undefined for a 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new GotoWebinarClient(ctx).request("/organizers/1/webinars/2");
  assertEquals(out, undefined);
});

Deno.test("client: status() returns the actual HTTP status", async () => {
  const { ctx } = mockCtx([{ status: 202 }]);
  const status = await new GotoWebinarClient(ctx).status("/organizers/1/webinars/2", {
    method: "PUT",
  });
  assertEquals(status, 202);
});

Deno.test("client: a non-2xx throws, formatted from the vendor's error body", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { int_err_code: "InvalidToken", msg: "Invalid token passed" } },
  ]);
  await assertRejects(
    () => new GotoWebinarClient(ctx).request("/organizers/1/webinars"),
    Error,
    "InvalidToken",
  );
});

Deno.test("formatGotoError: reads int_err_code and msg, verified live shape", () => {
  const msg = formatGotoError(
    403,
    "GET",
    "/organizers/1/webinars",
    JSON.stringify({ int_err_code: "InvalidToken", msg: "Invalid token passed" }),
  );
  assertEquals(
    msg,
    "GoTo Webinar 403 InvalidToken for GET /organizers/1/webinars: Invalid token passed",
  );
});

Deno.test("formatGotoError: falls back to the raw body when it is not the vendor's error shape", () => {
  const msg = formatGotoError(500, "GET", "/organizers/1/webinars", "upstream exploded");
  assertEquals(msg, "GoTo Webinar 500 for GET /organizers/1/webinars: upstream exploded");
});

Deno.test("resolveOrganizerKey: an explicit param wins over the connection", () => {
  const { ctx } = mockCtxWithOrganizer([], "from-connection");
  assertEquals(resolveOrganizerKey(ctx.connection, "from-param"), "from-param");
});

Deno.test("resolveOrganizerKey: falls back to the connection's captured key", () => {
  const { ctx } = mockCtxWithOrganizer([], "from-connection");
  assertEquals(resolveOrganizerKey(ctx.connection, undefined), "from-connection");
});

Deno.test("resolveOrganizerKey: throws an actionable error when neither is set", () => {
  assertThrows(() => resolveOrganizerKey(undefined, undefined), Error, "organizerKey");
});
