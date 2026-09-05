import { assertEquals } from "@std/assert";
import requestReviewerData from "../../actions/request-reviewer-data.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("request-reviewer-data: posts the customer/orders_requested shape from the doc's example", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await requestReviewerData.execute({
    email: "john@example.com",
    orderExternalIds: ["order_1", "order_2"],
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/reviewers/data_request");
  assertEquals(JSON.parse(calls[0].body!), {
    customer: { email: "john@example.com" },
    orders_requested: ["order_1", "order_2"],
  });
  assertEquals(out, { result: {} });
});
