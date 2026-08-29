import { assertEquals } from "@std/assert";
import emailList from "../../actions/email-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("email-list: GETs /emails with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "e1" }] } }]);
  const out = await emailList.execute(
    { campaign_id: "c1", is_unread: true, limit: 5 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/emails");
  assertEquals(queryOf(calls[0].url), { campaign_id: "c1", is_unread: "true", limit: "5" });
  assertEquals(out.items.length, 1);
});
