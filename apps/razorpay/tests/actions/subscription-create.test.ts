import { assertEquals } from "@std/assert";
import subscriptionCreate from "../../actions/subscription-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-create: posts to /subscriptions, nesting notify_info and converting notify to 0/1", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_1", short_url: "https://rzp.io/s/abc" } }]);
  const out = await subscriptionCreate.execute(
    {
      planId: "plan_1",
      totalCount: 12,
      customerNotify: true,
      notifyPhone: "+919876543210",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/subscriptions");
  assertEquals(JSON.parse(calls[0].body!), {
    plan_id: "plan_1",
    total_count: 12,
    customer_notify: 1,
    notify_info: { notify_phone: "+919876543210" },
  });
  assertEquals(out, { id: "sub_1", short_url: "https://rzp.io/s/abc" });
});

Deno.test("subscription-create: total_count=0 (indefinite) survives compact() — zero is not 'unset'", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sub_2" } }]);
  await subscriptionCreate.execute({ planId: "plan_1", totalCount: 0 }, ctx);

  assertEquals(JSON.parse(calls[0].body!).total_count, 0);
});
