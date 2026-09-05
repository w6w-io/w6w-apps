import { assertEquals } from "@std/assert";
import listGet from "../../actions/list-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-get: fetches one list by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "2", name: "Newsletter", total_subscribers: 40 },
  }]);
  const out = await listGet.execute({ accountId: "1", listId: "2" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2");
  assertEquals(out.total_subscribers, 40);
});
