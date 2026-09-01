import { assert, assertEquals } from "@std/assert";
import { compact, formatRazorpayError, RazorpayClient, truncate } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: get sends accept header and no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pay_1" } }]);
  const out = await new RazorpayClient(ctx).get("/payments/pay_1");

  assertEquals(pathOf(calls[0].url), "/v1/payments/pay_1");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "pay_1" });
});

Deno.test("client: get compacts and serialises a query object", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0, items: [] } }]);
  await new RazorpayClient(ctx).get("/payments", { count: 5, skip: undefined, receipt: "" });

  assertEquals(queryOf(calls[0].url), { count: "5" });
});

Deno.test("client: array query values are repeated as key[]", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0, items: [] } }]);
  await new RazorpayClient(ctx).get("/orders", { expand: ["payments", "transfers"] });

  assertEquals(queryOf(calls[0].url)["expand"], ["payments", "transfers"]);
});

Deno.test("client: post sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "order_1" } }]);
  await new RazorpayClient(ctx).post("/orders", { amount: 500, currency: "INR" });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { amount: 500, currency: "INR" });
});

Deno.test("client: post with no body sends none", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plink_1", status: "cancelled" } }]);
  await new RazorpayClient(ctx).post("/payment_links/plink_1/cancel");

  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: post forwards extra headers (e.g. idempotency)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rfnd_1" } }]);
  await new RazorpayClient(ctx).post("/payments/pay_1/refund", {}, {
    "X-Refund-Idempotency": "abc1234567",
  });

  assertEquals(calls[0].headers["x-refund-idempotency"], "abc1234567");
});

Deno.test("client: patch and put use their own verbs", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await new RazorpayClient(ctx).patch("/orders/order_1", { notes: {} });
  await new RazorpayClient(ctx).put("/customers/cust_1", { name: "A" });

  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[1].method, "PUT");
});

Deno.test("client: a non-2xx response throws a formatted error and never returns", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("BAD_REQUEST_ERROR", "Authentication failed") },
  ]);
  let threw = false;
  try {
    await new RazorpayClient(ctx).get("/payments");
  } catch (err) {
    threw = true;
    assert((err as Error).message.includes("Authentication failed"));
  }
  assert(threw, "expected the client to throw on a non-2xx response");
});

Deno.test("client: a 204/empty body resolves to undefined instead of throwing on parse", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const out = await new RazorpayClient(ctx).get("/payment_links/plink_1/cancel");
  assertEquals(out, undefined);
});

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("truncate: leaves short text alone and truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long);
  assert(out.length < long.length);
  assert(out.includes("700 bytes truncated"));
});

Deno.test("formatRazorpayError: surfaces code, description, reason and field", () => {
  const raw = JSON.stringify(
    errorBody("BAD_REQUEST_ERROR", "The api key provided is invalid", {
      reason: "input_validation_failed",
      field: "amount",
    }),
  );
  const msg = formatRazorpayError(400, "POST", "/v1/orders", raw);
  assert(msg.includes("BAD_REQUEST_ERROR"));
  assert(msg.includes("The api key provided is invalid"));
  assert(msg.includes("reason: input_validation_failed"));
  assert(msg.includes("field: amount"));
});

Deno.test("formatRazorpayError: a 429 appends backoff guidance", () => {
  const raw = JSON.stringify(errorBody("BAD_REQUEST_ERROR", "Too many requests"));
  const msg = formatRazorpayError(429, "GET", "/v1/payments", raw);
  assert(/exponential backoff/i.test(msg));
});

Deno.test("formatRazorpayError: an unparseable body falls back to the raw text", () => {
  const msg = formatRazorpayError(500, "GET", "/v1/payments", "<html>gateway error</html>");
  assert(msg.includes("<html>gateway error</html>"));
});
