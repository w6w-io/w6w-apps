import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-hard-bounces-list.ts";

Deno.test("email-hard-bounces-list: sends the date range, limit, offset and email filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { emails: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({
    startDate: "2026-01-01",
    endDate: "2026-02-01",
    limit: 50,
    offset: 10,
    email: "a@b.com",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/email/hard_bounces");
  assertEquals(q.get("start_date"), "2026-01-01");
  assertEquals(q.get("end_date"), "2026-02-01");
  assertEquals(q.get("limit"), "50");
  assertEquals(q.get("offset"), "10");
  assertEquals(q.get("email"), "a@b.com");
});
