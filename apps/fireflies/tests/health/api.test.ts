import { assert, assertEquals } from "@std/assert";
import { AUTH_FAILED_500, mockCtx, sent } from "../_helpers.ts";
import api from "../../health/api.ts";
import { API_URL } from "../../lib/client.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => api.check!({}, ctx);

Deno.test("health/api: an HTTP 500 auth_failed is a PASS — the endpoint answered", async () => {
  // The whole point of this check. A status-code verdict would report
  // Fireflies permanently down, because the probe is deliberately unsigned.
  const { ctx, calls } = mockCtx([AUTH_FAILED_500]);
  const report = await run(ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("auth_failed"));
  assertEquals(calls[0].url, API_URL);
  assertEquals(calls[0].method, "POST");
  // Unsigned: the hook must not stamp a credential of its own.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(sent(calls[0]).query, "{ __typename }");
});

Deno.test("health/api: a clean data response is a pass", async () => {
  const { ctx } = mockCtx([{ body: { data: { __typename: "Query" } } }]);
  assertEquals((await run(ctx)).state, "ok");
});

Deno.test("health/api: a different GraphQL error is degraded, not down", async () => {
  // The GraphQL layer is still running; we just cannot interpret the answer.
  const { ctx } = mockCtx([{
    status: 500,
    body: { errors: [{ message: "boom", code: "invariant_violation" }] },
  }]);
  const report = await run(ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("invariant_violation"));
});

Deno.test("health/api: an HTML body is down — that is not the API answering", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<!DOCTYPE html><html>edge error</html>" }]);
  const report = await run(ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("non-JSON"));
});

Deno.test("health/api: JSON with neither data nor errors is unknown, never down", async () => {
  // Saying "down" here would be a guess; `unknown` is the honest answer.
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }]);
  assertEquals((await run(ctx)).state, "unknown");
});
