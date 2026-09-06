import { assertEquals } from "@std/assert";
import memberList from "../../actions/member-list.ts";
import { mockCtx, odataList, pathOf, queryOf } from "../_helpers.ts";

Deno.test("member-list: calls GET /v1/People and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "p1" }], 3) }]);
  const out = await memberList.execute({ top: 5 }, ctx) as { items: unknown[]; count?: number };
  assertEquals(pathOf(calls[0].url), "/v1/People");
  assertEquals(queryOf(calls[0].url)["$top"], "5");
  assertEquals(out.items, [{ id: "p1" }]);
  assertEquals(out.count, 3);
});

Deno.test("member-list: passes filter/select/expand/orderBy through as OData keys", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([]) }]);
  await memberList.execute({
    filter: "role eq 'Member'",
    select: "id,fullName",
    expand: "group($select=id,name)",
    orderBy: "fullName",
    count: true,
  }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q["$filter"], "role eq 'Member'");
  assertEquals(q["$select"], "id,fullName");
  assertEquals(q["$expand"], "group($select=id,name)");
  assertEquals(q["$orderby"], "fullName");
  assertEquals(q["$count"], "true");
});
