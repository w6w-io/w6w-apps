import { assertEquals } from "@std/assert";
import phoneNumberList from "../../actions/phone-number-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("phone-number-list: hits GET /v2.1/phone-numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await phoneNumberList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2.1/phone-numbers");
});

/** This endpoint's own `order` enum is uppercase, unlike calls/contacts/users. */
Deno.test("phone-number-list: order is sent uppercase, unlike every other list action", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await phoneNumberList.execute({ order: "ASC" }, ctx);
  assertEquals(queryOf(calls[0].url).order, "ASC");
});
