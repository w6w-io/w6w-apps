import { assertEquals } from "@std/assert";
import accountInfo from "../../actions/account-info.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-info: calls GET /account/info and returns the parsed body", async () => {
  const body = {
    status: "success",
    credits_info: {
      paid_credits_used: 0,
      free_credits_used: 0,
      paid_credits_remaining: 9950791,
      free_credits_remaining: 0,
    },
    job_counts: { completed: 409, under_review: 0, queued: 0, processing: 0 },
    execution_time: 896,
  };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await accountInfo.execute({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4.2/account/info");
  assertEquals(result, body);
});
