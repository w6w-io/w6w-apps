import { assertEquals } from "@std/assert";
import subscriberFind from "../../actions/subscriber-find.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-find: searches with ws.op=find and JSON-encodes tag filters", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 1 }]) }]);
  await subscriberFind.execute(
    { accountId: "1", listId: "2", tags: ["vip", "trial"], tagsNotIn: ["unsubscribed"] },
    ctx,
  );

  const q = queryOf(calls[0].url);
  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers");
  assertEquals(q["ws.op"], "find");
  assertEquals(q.tags, JSON.stringify(["vip", "trial"]));
  assertEquals(q.tags_not_in, JSON.stringify(["unsubscribed"]));
});

Deno.test("subscriber-find: extraFilters merges vendor query names verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([]) }]);
  await subscriberFind.execute(
    { accountId: "1", listId: "2", extraFilters: { area_code: 215, postal_code: "19001" } },
    ctx,
  );

  const q = queryOf(calls[0].url);
  assertEquals(q.area_code, "215");
  assertEquals(q.postal_code, "19001");
});

Deno.test("subscriber-find: extraFilters also accepts a JSON string, like other json params", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([]) }]);
  await subscriberFind.execute(
    { accountId: "1", listId: "2", extraFilters: '{"region": "PA"}' },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).region, "PA");
});
