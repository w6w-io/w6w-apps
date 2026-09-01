import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import app from "../../health/app.ts";

const conn = { display: { baseUrl: "https://myapp.bubbleapps.io" } };

Deno.test("app: a 404 JSON answer means the app itself is reachable", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: {
      statusCode: 404,
      body: { status: "NOT_FOUND", message: "This application does not expose a Data API" },
    },
  }], conn);
  const report = await app.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://myapp.bubbleapps.io/api/1.1/obj/__w6w_health_check__");
  assert(!calls[0].headers.authorization, "the app-reachability check must be unsigned");
});

Deno.test("app: a 400 OwnerError means no app at this URL", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body: "Error: OwnerError\n\nMessage: invalid appname hosted on bubbleapps.io\nCode: 123",
    headers: { "content-type": "text/plain" },
  }], conn);
  const report = await app.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("app URL"), report.message);
});

Deno.test("app: an unrecognised 400 is degraded, not assumed down", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: "some other bad request",
    headers: { "content-type": "text/plain" },
  }], conn);
  assertEquals((await app.check!({}, ctx)).state, "degraded");
});

Deno.test("app: an unreachable host is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await app.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"));
});

Deno.test("app: a connection with no URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await app.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("app: is a connection-scoped, unsigned dependency check", () => {
  assertEquals(app.kind, "dependency");
  assertEquals(app.scope, "connection");
  assertEquals(app.credential, "context");
});
