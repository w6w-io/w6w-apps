import { assertEquals } from "@std/assert";
import listFind from "../../actions/list-find.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-find: searches lists by name with ws.op=find", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 2, name: "Newsletter" }]) }]);
  await listFind.execute({ accountId: "1", name: "News" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists");
  assertEquals(queryOf(calls[0].url)["ws.op"], "find");
  assertEquals(queryOf(calls[0].url).name, "News");
});

Deno.test("list-find: name is optional — matches every list when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([]) }]);
  await listFind.execute({ accountId: "1" }, ctx);
  assertEquals(queryOf(calls[0].url).name, undefined);
});
