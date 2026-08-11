import { assert, assertEquals, assertRejects } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import customerGet from "../../actions/customer-get.ts";
import customerCreate from "../../actions/customer-create.ts";
import customerUpdate from "../../actions/customer-update.ts";
import subscriptionList from "../../actions/subscription-list.ts";
import subscriptionGet from "../../actions/subscription-get.ts";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import subscriptionPause from "../../actions/subscription-pause.ts";
import subscriptionResume from "../../actions/subscription-resume.ts";
import transactionList from "../../actions/transaction-list.ts";
import transactionGet from "../../actions/transaction-get.ts";
import transactionInvoice from "../../actions/transaction-invoice.ts";
import adjustmentList from "../../actions/adjustment-list.ts";
import adjustmentCreate from "../../actions/adjustment-create.ts";
import { envelope, mockPaddleCtx } from "../_helpers.ts";

Deno.test("customer-list: keeps exact-email and fuzzy-search as separate parameters", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await customerList.execute({ email: "jo@example.com,sam@example.com", search: "jo" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("email"), "jo@example.com,sam@example.com");
  assertEquals(url.searchParams.get("search"), "jo");
});

Deno.test("customer-get: builds the customer path", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await customerGet.execute({ customerId: "ctm_01hv6y1jedq4p1n0yqn5ba3ky4" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/customers/ctm_01hv6y1jedq4p1n0yqn5ba3ky4");
});

Deno.test("customer-create: posts email and name", async () => {
  const { ctx, calls } = mockPaddleCtx([{ status: 201, body: envelope({ id: "ctm_1" }) }]);
  await customerCreate.execute({ email: "jo@example.com", name: "Jo Brown" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "jo@example.com", name: "Jo Brown" });
});

Deno.test("customer-update: patches only what changed", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await customerUpdate.execute({ customerId: "ctm_1", status: "archived" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { status: "archived" });
});

Deno.test("subscription-list: maps the scheduled-change filter", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await subscriptionList.execute({
    customerId: "ctm_1",
    status: ["active", "trialing"],
    scheduledChangeAction: ["cancel"],
    collectionMode: "automatic",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("customer_id"), "ctm_1");
  assertEquals(url.searchParams.get("status"), "active,trialing");
  assertEquals(url.searchParams.get("scheduled_change_action"), "cancel");
  assertEquals(url.searchParams.get("collection_mode"), "automatic");
});

Deno.test("subscription-get: comma-joins the include values", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await subscriptionGet.execute({
    subscriptionId: "sub_01h04vsc0qhwtsbsxh3422wjr5",
    include: ["next_transaction", "recurring_transaction_details"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/subscriptions/sub_01h04vsc0qhwtsbsxh3422wjr5");
  assertEquals(url.searchParams.get("include"), "next_transaction,recurring_transaction_details");
});

/**
 * The three subscription writes are POSTs to `/{id}/{verb}`. Getting a verb or
 * a method wrong here is a billing-affecting bug, so each is pinned.
 */
Deno.test("subscription-cancel: POSTs to /cancel", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await subscriptionCancel.execute({ subscriptionId: "sub_1", effectiveFrom: "immediately" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/subscriptions/sub_1/cancel");
  assertEquals(JSON.parse(calls[0].body!), { effective_from: "immediately" });
});

/**
 * Omitting `effective_from` must send an EMPTY body, not `{"effective_from":
 * null}` — Paddle reads an explicit null as a value and the documented default
 * only applies to an absent key.
 */
Deno.test("subscription-cancel: an unset effective_from sends no key at all", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await subscriptionCancel.execute({ subscriptionId: "sub_1" }, ctx);
  assertEquals(calls[0].body, "{}");
});

Deno.test("subscription-pause: POSTs to /pause with the resume date and on_resume", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await subscriptionPause.execute({
    subscriptionId: "sub_1",
    resumeAt: "2026-09-01T16:30:00Z",
    onResume: "continue_existing_billing_period",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/subscriptions/sub_1/pause");
  assertEquals(JSON.parse(calls[0].body!), {
    resume_at: "2026-09-01T16:30:00Z",
    on_resume: "continue_existing_billing_period",
  });
});

/**
 * On resume — and only on resume — `effective_from` may be a datetime rather
 * than the `immediately` / `next_billing_period` enum. Passing a date through
 * unchanged is the behaviour being pinned.
 */
Deno.test("subscription-resume: passes a datetime effective_from straight through", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await subscriptionResume.execute({
    subscriptionId: "sub_1",
    effectiveFrom: "2026-09-01T16:30:00Z",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/subscriptions/sub_1/resume");
  assertEquals(JSON.parse(calls[0].body!), { effective_from: "2026-09-01T16:30:00Z" });
});

Deno.test("transaction-list: maps the bracketed date operators verbatim", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await transactionList.execute({
    createdAt: "[GTE]2026-08-01T00:00:00Z",
    status: ["completed"],
    include: ["customer", "adjustments"],
    perPage: 30,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("created_at"), "[GTE]2026-08-01T00:00:00Z");
  assertEquals(url.searchParams.get("status"), "completed");
  assertEquals(url.searchParams.get("include"), "customer,adjustments");
  assertEquals(url.searchParams.get("per_page"), "30");
});

Deno.test("transaction-get: builds the transaction path", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }]);
  await transactionGet.execute({ transactionId: "txn_1", include: "customer" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/transactions/txn_1");
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "customer");
});

Deno.test("transaction-invoice: hits /invoice and returns the link Paddle issues", async () => {
  const { ctx, calls } = mockPaddleCtx([
    { body: envelope({ url: "https://paddle-invoice-service…/invoice.pdf" }) },
  ]);
  const out = await transactionInvoice.execute(
    { transactionId: "txn_1", disposition: "inline" },
    ctx,
  ) as { url?: string };
  assertEquals(new URL(calls[0].url).pathname, "/transactions/txn_1/invoice");
  assertEquals(new URL(calls[0].url).searchParams.get("disposition"), "inline");
  assert(out.url!.endsWith(".pdf"));
});

Deno.test("adjustment-list: filters by transaction and action", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await adjustmentList.execute({ transactionId: "txn_1", action: ["refund", "credit"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("transaction_id"), "txn_1");
  assertEquals(url.searchParams.get("action"), "refund,credit");
});

Deno.test("adjustment-create: posts the documented refund body", async () => {
  const { ctx, calls } = mockPaddleCtx([{ status: 201, body: envelope({ id: "adj_1" }) }]);
  await adjustmentCreate.execute({
    transactionId: "txn_01h04vsc0qhwtsbsxh3422wjr5",
    action: "refund",
    reason: "Customer changed their mind",
    items: '[{"item_id":"txnitm_01h04vsc0qhwtsbsxh3422wjr5","type":"full"}]',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/adjustments");
  assertEquals(JSON.parse(calls[0].body!), {
    transaction_id: "txn_01h04vsc0qhwtsbsxh3422wjr5",
    action: "refund",
    reason: "Customer changed their mind",
    items: [{ item_id: "txnitm_01h04vsc0qhwtsbsxh3422wjr5", type: "full" }],
  });
});

/** A full adjustment carries no items, and the key must be absent rather than null. */
Deno.test("adjustment-create: a full adjustment sends no items array", async () => {
  const { ctx, calls } = mockPaddleCtx([{ status: 201, body: envelope({}) }]);
  await adjustmentCreate.execute({
    transactionId: "txn_1",
    action: "credit",
    reason: "Goodwill",
    type: "full",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "full");
  assert(!("items" in body), JSON.stringify(body));
});

/** Money movement must never be silently retried by the runtime. */
Deno.test("adjustment-create: is not idempotent", () => {
  assertEquals(adjustmentCreate.idempotent, false);
});

Deno.test("adjustment-create: a bad items JSON string names the field", async () => {
  const { ctx } = mockPaddleCtx([]);
  await assertRejects(
    async () => {
      await adjustmentCreate.execute(
        { transactionId: "txn_1", action: "refund", reason: "x", items: "{nope" },
        ctx,
      );
    },
    Error,
    "Items is not valid JSON",
  );
});
