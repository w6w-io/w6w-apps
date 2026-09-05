import { assertEquals } from "@std/assert";
import subscriptionActivate from "../../actions/subscription-activate.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-activate: POSTs to /subscriptions/{id}/activate with an empty body", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("subscription", { id: 1, status: "active" }) },
  ]);
  const out = await subscriptionActivate.execute({ subscriptionId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/subscriptions/1/activate");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { id: 1, status: "active" });
});
