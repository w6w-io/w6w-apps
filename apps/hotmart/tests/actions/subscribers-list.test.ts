import { assertEquals, assertRejects } from "@std/assert";
import subscribersList from "../../actions/subscribers-list.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOfMulti } from "../_helpers.ts";

Deno.test("subscribers-list - repeats status/plan as separate query keys, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ subscriber_code: "A" }]) }]);
  await subscribersList.execute({
    productId: 1,
    plan: ["Gold", "Silver"],
    status: ["ACTIVE", "OVERDUE"],
    trial: false,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/payments/api/v1/subscriptions");
  const q = queryOfMulti(calls[0].url);
  assertEquals(q.status, ["ACTIVE", "OVERDUE"]);
  assertEquals(q.plan, ["Gold", "Silver"]);
  assertEquals(q.product_id, ["1"]);
});

Deno.test("subscribers-list - sends trial=false explicitly rather than dropping it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await subscribersList.execute({ trial: false }, ctx);
  assertEquals(queryOfMulti(calls[0].url).trial, ["false"]);
});

Deno.test("subscribers-list - surfaces product_not_found", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("product_not_found", "Product not found"),
  }]);
  await assertRejects(
    () => Promise.resolve(subscribersList.execute({}, ctx)),
    Error,
    "product_not_found",
  );
});
