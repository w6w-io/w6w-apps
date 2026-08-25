import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-list.ts";

Deno.test("label-list: sends filters as query params", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { labels: [], total: 0, page: 1, pages: 0 } },
  ]);
  await action.execute!({ labelStatus: "completed", trackingNumber: "1Z999" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/labels");
  assertEquals(url.searchParams.get("label_status"), "completed");
  assertEquals(url.searchParams.get("tracking_number"), "1Z999");
});

Deno.test("label-list: returns pagination fields", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { labels: [{ label_id: "se-1" }], total: 1, page: 1, pages: 1 } },
  ]);
  const result = await action.execute!({}, ctx) as { labels: unknown[]; total: number };
  assertEquals(result.labels.length, 1);
  assertEquals(result.total, 1);
});
