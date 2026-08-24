import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-usage-get.ts";

Deno.test("account-usage-get: builds the path with an explicit year/month and pins type=subaccount", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Here is your usage statistics.",
        data: { sms: [], _currency: { currency_name_short: "AUD" } },
      },
    },
  ]);
  const result = await action.execute({ year: 2026, month: 8 }, ctx) as {
    currency: unknown;
  };
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/account/usage/2026/8/subaccount");
  assertEquals(result.currency, { currency_name_short: "AUD" });
});

Deno.test("account-usage-get: defaults year/month to the current UTC calendar month", async () => {
  const { ctx, calls } = mockCtx([
    { body: { http_code: 200, response_code: "SUCCESS", response_msg: "ok", data: {} } },
  ]);
  await action.execute({}, ctx);
  const now = new Date();
  const expected = `https://rest.clicksend.com/v3/account/usage/${now.getUTCFullYear()}/${
    now.getUTCMonth() + 1
  }/subaccount`;
  assertEquals(calls[0].url, expected);
});
