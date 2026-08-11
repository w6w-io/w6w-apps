import { assert, assertEquals, assertRejects } from "@std/assert";
import callGet from "../../actions/call-get.ts";
import { appErrorBody, edgeErrorBody, entityBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-get: calls GET /v1/calls/{id} and unwraps the call envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: entityBody("call", { id: 812, direction: "outbound", status: "done" }) },
  ]);
  const out = await callGet.execute({ callId: "812" }, ctx) as { direction: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/calls/812");
  assertEquals(out.direction, "outbound");
});

Deno.test("call-get: a slash pasted into the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("call", {}) }]);
  await callGet.execute({ callId: "812/../../company" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/calls/812%2F..%2F..%2Fcompany");
});

Deno.test("call-get: fetchContact reaches the wire as fetch_contact=true", async () => {
  const { ctx, calls } = mockCtx([{ body: entityBody("call", {}) }]);
  await callGet.execute({ callId: "812", fetchContact: true }, ctx);
  assertEquals(queryOf(calls[0].url), { fetch_contact: "true" });
});

/**
 * The documented application-tier error body. Both halves must survive into the
 * message or the reader is left with a bare status code.
 */
Deno.test("call-get: a documented {error, troubleshoot} body is surfaced in full", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: appErrorBody("Not Found", "Call with id 999 does not exist") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(callGet.execute({ callId: "999" }, ctx)),
    Error,
  );
  assert(err.message.includes("Not Found"), err.message);
  assert(err.message.includes("Call with id 999 does not exist"), err.message);
});

/**
 * The measured edge body, which is NOT the documented shape. A formatter that
 * only knows `{error, troubleshoot}` renders every auth failure — the most
 * common failure on this API — as an empty string.
 */
Deno.test("call-get: the undocumented {message} edge body is surfaced too", async () => {
  const { ctx } = mockCtx([{ status: 403, body: edgeErrorBody("Forbidden") }]);
  const err = await assertRejects(
    () => Promise.resolve(callGet.execute({ callId: "812" }, ctx)),
    Error,
  );
  assert(err.message.includes("Forbidden"), err.message);
  assert(
    err.message.includes("INVALID api_id/api_token"),
    `403 must be explained as a bad credential, not a missing permission: ${err.message}`,
  );
});
