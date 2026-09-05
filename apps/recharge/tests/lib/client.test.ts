import { assert, assertEquals, assertRejects } from "@std/assert";
import { compact, formatRechargeError, RechargeClient, truncate } from "../../lib/client.ts";
import { envelope, fieldErrorBody, listEnvelope, mockCtx, singleErrorBody } from "../_helpers.ts";

Deno.test("client: single() unwraps the resource-named key", async () => {
  const { ctx } = mockCtx([{ body: envelope("customer", { id: 1, email: "a@b.com" }) }]);
  const out = await new RechargeClient(ctx).single("/customers/1", "customer");
  assertEquals(out, { id: 1, email: "a@b.com" });
});

Deno.test("client: list() returns items plus both cursors", async () => {
  const { ctx } = mockCtx([
    {
      body: listEnvelope("customers", [{ id: 1 }, { id: 2 }], {
        nextCursor: "next-abc",
        previousCursor: "prev-xyz",
      }),
    },
  ]);
  const page = await new RechargeClient(ctx).list("/customers", "customers");
  assertEquals(page.items, [{ id: 1 }, { id: 2 }]);
  assertEquals(page.nextCursor, "next-abc");
  assertEquals(page.previousCursor, "prev-xyz");
});

Deno.test("client: list() omits cursors that are null/absent rather than passing them through", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope("customers", []) }]);
  const page = await new RechargeClient(ctx).list("/customers", "customers");
  assertEquals(page.nextCursor, undefined);
  assertEquals(page.previousCursor, undefined);
});

Deno.test("client: every request sends the pinned API version and the access-token header", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("customer", { id: 1 }) }]);
  await new RechargeClient(ctx).single("/customers/1", "customer");
  assertEquals(calls[0].headers["x-recharge-version"], "2021-11");
});

Deno.test("client: status() returns the HTTP status without throwing on 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new RechargeClient(ctx).status("/webhooks/1", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("client: a non-ok response throws with the vendor's own error text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: singleErrorBody("bad authentication") }]);
  await assertRejects(
    () => new RechargeClient(ctx).single("/token_information", "token_information"),
    Error,
    "bad authentication",
  );
});

Deno.test("client: a 422 field-error body is rendered field-by-field, not as raw JSON", async () => {
  const { ctx } = mockCtx([
    {
      status: 422,
      body: fieldErrorBody({ date: ["Date must be at least one day in the future"] }),
    },
  ]);
  await assertRejects(
    () => new RechargeClient(ctx).single("/subscriptions/1/set_next_charge_date", "subscription"),
    Error,
    "date: Date must be at least one day in the future",
  );
});

Deno.test("formatRechargeError: prefers the errors object over the single error string", () => {
  const msg = formatRechargeError(
    422,
    "POST",
    "/subscriptions/1/cancel",
    JSON.stringify({ errors: { cancellation_reason: ["is required"] } }),
  );
  assert(msg.includes("cancellation_reason: is required"));
});

Deno.test("formatRechargeError: falls back to the raw body when neither shape matches", () => {
  const msg = formatRechargeError(500, "GET", "/customers", "<html>Internal Server Error</html>");
  assert(msg.includes("<html>Internal Server Error</html>"));
});

Deno.test("compact: drops undefined, null and empty-string values but keeps false/0/[]", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: [], g: "keep" });
  assertEquals(out, { d: false, e: 0, f: [], g: "keep" });
});

Deno.test("truncate: leaves short text untouched and caps long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(900);
  const out = truncate(long, 800);
  assert(out.length < long.length);
  assert(out.includes("900 bytes truncated"));
});
