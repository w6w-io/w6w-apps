import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/subscription-list.ts";

Deno.test("subscription-list: lists subscriptions via Object Query", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "sub1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://rest.zuora.com/object-query/subscriptions");
  assertEquals(result.count, 1);
});

Deno.test("subscription-list: filters by account when asked", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ filter: "accountNumber.EQ:A00000097" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("filter[]"), ["accountNumber.EQ:A00000097"]);
});
