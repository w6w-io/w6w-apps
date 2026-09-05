import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-status-set.ts";

Deno.test("email-status-set: posts email and subscription_state", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "success" } }], {
    display: { instance: "iad-01" },
  });
  const result = await action.execute!({
    email: "a@b.com",
    subscriptionState: "unsubscribed",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/email/status");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { email: "a@b.com", subscription_state: "unsubscribed" });
  assertEquals(result, { message: "success" });
});
