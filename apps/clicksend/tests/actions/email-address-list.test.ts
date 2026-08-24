import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-address-list.ts";

Deno.test("email-address-list: lists sender addresses with verified flags", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Here are your email addresses",
        data: {
          total: 2,
          per_page: 15,
          current_page: 1,
          last_page: 1,
          data: [
            { email_address_id: 2, email_address: "test@user.com", verified: 1 },
            { email_address_id: 3, email_address: "test2@user.com", verified: 0 },
          ],
        },
      },
    },
  ]);
  const result = await action.execute({}, ctx) as {
    addresses: Array<{ verified: number }>;
    total: number;
  };
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/email/addresses");
  assertEquals(result.addresses.length, 2);
  assertEquals(result.addresses[0].verified, 1);
  assertEquals(result.total, 2);
});
