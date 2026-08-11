import { assertEquals, assertRejects } from "@std/assert";
import bookingTypeCreate from "../../actions/booking-type-create.ts";
import { bodyOf, envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const REQUIRED = {
  title: "30 Minute Meeting",
  description: "Book a 30 minute meeting with me",
  duration_minutes: 30,
  url_slug: "30-minute-meeting",
};

Deno.test("booking-type-create: POSTs the four required fields to /api/booking-types", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 9 }) }]);
  const out = await bookingTypeCreate.execute(REQUIRED, ctx) as { data: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/booking-types");
  assertEquals(bodyOf(calls[0]), REQUIRED);
  assertEquals(out.data.id, 9);
});

/**
 * The body is projected onto the eighteen documented fields, not spread from the
 * input: posting an undocumented key to a Laravel validator is how a create
 * turns into a 422 nobody can explain.
 */
Deno.test("booking-type-create: drops blanks and anything undocumented", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await bookingTypeCreate.execute(
    {
      ...REQUIRED,
      redirect_url: "",
      price: 25,
      payment_platform: "stripe",
      // Not in TidyCal's request schema — the host may add keys of its own.
      somethingElse: "x",
    } as Record<string, unknown>,
    ctx,
  );
  assertEquals(bodyOf(calls[0]), { ...REQUIRED, price: 25, payment_platform: "stripe" });
});

/** `price: 0` is meaningful (a free booking type) and must survive. */
Deno.test("booking-type-create: a zero price is sent, not treated as blank", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await bookingTypeCreate.execute({ ...REQUIRED, price: 0, booking_threshold: 0 }, ctx);
  assertEquals(bodyOf(calls[0]).price, 0);
  assertEquals(bodyOf(calls[0]).booking_threshold, 0);
});

Deno.test("booking-type-create: a 422 keeps the per-field messages", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("The given data was invalid.", {
      url_slug: ["The url slug has already been taken."],
    }),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(bookingTypeCreate.execute(REQUIRED, ctx)),
    Error,
  );
  assertEquals(err.message.includes("url_slug"), true, err.message);
  assertEquals(err.message.includes("already been taken"), true, err.message);
});
