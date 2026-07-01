import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-order.ts";

const DEFAULT_EXPAND =
  "attendees,ticket_buyer_settings,contact_list_preferences,answers,survey_responses,survey,refund_requests";

Deno.test("get-order: GETs /orders/{id}/ with default expand", async () => {
  const body = { id: "ord-1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ orderId: "ord-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/orders/ord-1/");
  assertEquals(url.searchParams.get("expand"), DEFAULT_EXPAND);
  assertEquals(result, body);
});

Deno.test("get-order: honors caller-provided expand", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ord-2" } }]);
  await action.execute!({ orderId: "ord-2", expand: "answers" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("expand"), "answers");
});
