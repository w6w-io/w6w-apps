import { assertEquals } from "@std/assert";
import affiliateGroupCreate from "../../actions/affiliate-group-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-group-create: posts {title} — also only documented in the code sample", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "ag_nK6qZzk0JgnXJFsHQ-", title: "Silver Affiliates" },
  }]);
  const out = await affiliateGroupCreate.execute({ title: "Silver Affiliates" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/1.6/affiliate-groups/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { title: "Silver Affiliates" });
  assertEquals(out.title, "Silver Affiliates");
});
