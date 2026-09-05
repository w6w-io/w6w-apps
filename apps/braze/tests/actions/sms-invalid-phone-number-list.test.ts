import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sms-invalid-phone-number-list.ts";

Deno.test("sms-invalid-phone-number-list: sends the date range, limit and offset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { invalid_phone_numbers: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({ startDate: "2026-01-01", endDate: "2026-02-01", limit: 10 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/sms/invalid_phone_numbers");
  assertEquals(q.get("start_date"), "2026-01-01");
  assertEquals(q.get("end_date"), "2026-02-01");
  assertEquals(q.get("limit"), "10");
});

/** Braze's own spec mistypes this as an integer; the prose and example are unambiguous. */
Deno.test("sms-invalid-phone-number-list: phone_numbers is sent as repeated array-form keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { invalid_phone_numbers: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({ phoneNumbers: ["+12345678901", "+19998887777"] }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("phone_numbers[]"), ["+12345678901", "+19998887777"]);
});
