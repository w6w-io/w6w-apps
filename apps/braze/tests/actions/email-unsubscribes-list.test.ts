import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-unsubscribes-list.ts";

Deno.test("email-unsubscribes-list: sends the date range, sort_direction and email filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { emails: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({
    startDate: "2026-01-01",
    endDate: "2026-02-01",
    sortDirection: "asc",
    email: "a@b.com",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/email/unsubscribes");
  assertEquals(q.get("sort_direction"), "asc");
  assertEquals(q.get("email"), "a@b.com");
});
