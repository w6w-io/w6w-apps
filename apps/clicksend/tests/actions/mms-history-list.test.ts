import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/mms-history-list.ts";

Deno.test("mms-history-list: unwraps the page and forwards search/sort params", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Here is your history.",
        data: {
          total: 1,
          per_page: 15,
          current_page: 1,
          last_page: 1,
          data: [{ message_id: "M1", status: "Failed" }],
        },
      },
    },
  ]);

  const result = await action.execute(
    { q: "list_id:429,direction:out", orderBy: "subject:desc" },
    ctx,
  ) as { rows: unknown[] };
  assertEquals(result.rows.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("q"), "list_id:429,direction:out");
  assertEquals(url.searchParams.get("order_by"), "subject:desc");
});
