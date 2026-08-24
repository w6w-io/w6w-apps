import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sms-history-list.ts";

Deno.test("sms-history-list: unwraps the double-nested page envelope", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Here are your data.",
        data: {
          total: 2,
          per_page: 15,
          current_page: 1,
          last_page: 1,
          next_page_url: null,
          prev_page_url: null,
          from: 1,
          to: 2,
          data: [{ message_id: "A" }, { message_id: "B" }],
        },
      },
    },
  ]);

  const result = await action.execute({}, ctx) as {
    rows: unknown[];
    total: number;
    currentPage: number;
  };
  assertEquals(result.rows.length, 2);
  assertEquals(result.total, 2);
  assertEquals(result.currentPage, 1);
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/sms/history");
});

Deno.test("sms-history-list: forwards date filters and pagination as query params", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "ok",
        data: { total: 0, per_page: 15, current_page: 1, last_page: 1, data: [] },
      },
    },
  ]);
  await action.execute({ dateFrom: 100, dateTo: 200, page: 2, limit: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("date_from"), "100");
  assertEquals(url.searchParams.get("date_to"), "200");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("limit"), "50");
});
