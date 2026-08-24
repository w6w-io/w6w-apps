import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: strips _subaccount.api_key before returning", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Here's your account",
        data: {
          user_id: 3819,
          username: "ULXHP",
          balance: "1117.461060",
          _currency: { currency_name_short: "AUD" },
          _subaccount: {
            subaccount_id: 1716,
            api_username: "KCIHOYEYGM",
            api_key: "IJVEGTCF-VOHU-GSVF-KNKK-XHTARJXMQTXK",
            access_sms: 0,
          },
        },
      },
    },
  ]);

  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/account");

  const account = result.account as { _subaccount: Record<string, unknown> };
  assertEquals("api_key" in account._subaccount, false);
  // Everything else on _subaccount survives — this is a targeted strip, not a wipe.
  assertEquals(account._subaccount.api_username, "KCIHOYEYGM");
  assertEquals(account._subaccount.access_sms, 0);

  assertEquals(result.userId, 3819);
  assertEquals(result.username, "ULXHP");
  assertEquals(result.balance, "1117.461060");
});

Deno.test("account-get: tolerates a null _subaccount (e.g. on the top-level user)", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "ok",
        data: { user_id: 1, username: "johndoe", balance: "0.59", _subaccount: null },
      },
    },
  ]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.account as Record<string, unknown>)._subaccount, null);
});
