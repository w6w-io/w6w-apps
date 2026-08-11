import { assert, assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

/** The live unauthenticated response, verbatim — measured 2026-08-11. */
const UNAUTHENTICATED_401 = {
  title: "An error occurred.",
  detail: "Full authentication is required to access this resource.",
  status: 401,
  type: "/errors/401",
};

Deno.test("api: is an unsigned dependency check that adds no egress hosts", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.credential, "none");
  assertEquals(check.network, undefined, "api.emailoctopus.com is already the app's own host");
});

Deno.test("api: a schema-correct 401 is a PASS — it proves the API is answering", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: UNAUTHENTICATED_401 }]);
  const report = await check.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists");
  assert(!("authorization" in calls[0].headers), "this probe must send no credential");
  assertEquals(report.state, "ok");
});

Deno.test("api: a 401 without the documented body is degraded, not ok", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>Access denied</html>" }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("intermediary"));
});

Deno.test("api: an unauthenticated 200 is suspicious, not healthy", async () => {
  // The failure this guards: an endpoint that answers everyone would let a
  // connection whose key never attached look fine.
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("expected 401"));
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { detail: "nope" } }]);
  assertEquals((await check.check!({}, ctx)).state, "down");
});

Deno.test("api: an unexpected 4xx is degraded and quotes what came back", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { title: "An error occurred.", detail: "Resource not found.", status: 404 },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("Resource not found."));
});

Deno.test("api: a transport failure is down, with the cause", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns failure")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof check.check>>[1];
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("dns failure"));
});
