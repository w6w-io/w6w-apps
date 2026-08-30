import { assertEquals } from "@std/assert";
import conversationList from "../../actions/conversation-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-list: sends every documented filter with the vendor's wire names", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ contact_id: "c1" }], { count: 1 }) }]);
  const out = await conversationList.execute(
    {
      formId: "f1",
      excludeHumans: true,
      limit: 100,
      onlyUnread: false,
      onlyWithoutTags: false,
      messageStatus: "without_reply",
      scoreGt: 10,
      scoreLt: 25,
      tag: "t1",
      createdAtStartDate: "2022-12-01",
      createdAtEndDate: "2022-02-01",
      orderBy: "-latest_interaction",
    },
    ctx,
  ) as { count: number; results: unknown[] };

  assertEquals(pathOf(calls[0].url), "/forms/f1/conversations");
  assertEquals(queryOf(calls[0].url), {
    exclude_humans: "true",
    limit: "100",
    only_unread: "false",
    only_without_tags: "false",
    message_status: "without_reply",
    score_gt: "10",
    score_lt: "25",
    tag: "t1",
    created_at_start_date: "2022-12-01",
    created_at_end_date: "2022-02-01",
    order_by: "-latest_interaction",
  });
  assertEquals(out.count, 1);
});
