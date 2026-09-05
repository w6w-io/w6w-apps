import { assertEquals } from "@std/assert";
import subscriberFindAcrossLists from "../../actions/subscriber-find-across-lists.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-find-across-lists: searches at the account level with ws.op=findSubscribers", async () => {
  const { ctx, calls } = mockCtx([
    { body: entries([{ id: 1, list_link: "https://api.aweber.com/1.0/accounts/1/lists/2" }]) },
  ]);
  const out = await subscriberFindAcrossLists.execute(
    { accountId: "1", email: "a@b.com" },
    ctx,
  ) as { entries: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1");
  assertEquals(queryOf(calls[0].url)["ws.op"], "findSubscribers");
  assertEquals(queryOf(calls[0].url).email, "a@b.com");
  assertEquals(out.entries[0].list_link, "https://api.aweber.com/1.0/accounts/1/lists/2");
});
