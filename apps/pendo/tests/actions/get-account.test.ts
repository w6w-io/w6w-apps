import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-account.ts";

Deno.test("get-account: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "a1" } }]);
  const result = await action.execute!({ accountId: "a1" }, ctx) as { account: unknown };
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/account/a1");
  assertEquals(result.account, { id: "a1" });
});

Deno.test("get-account: `accountId` is required", async () => {
  await assertRejects(
    async () => await action.execute!({}, mockCtx([]).ctx),
    Error,
    "`accountId` is required",
  );
});
