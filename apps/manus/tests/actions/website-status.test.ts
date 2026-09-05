import { assertEquals } from "@std/assert";
import websiteStatus from "../../actions/website-status.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("website-status: sends task_id as a query param", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({
      website_id: "w1",
      publish_status: "published",
      site_urls: ["https://w1.manus.space"],
    }),
  }]);
  const out = await websiteStatus.execute({ taskId: "t1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/website.status");
  assertEquals(queryOf(calls[0].url), { task_id: "t1" });
  assertEquals(out.publish_status, "published");
});

Deno.test("website-status: sends website_id as a query param", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ website_id: "w1", publish_status: "unpublished", site_urls: [] }),
  }]);
  await websiteStatus.execute({ websiteId: "w1" }, ctx);
  assertEquals(queryOf(calls[0].url), { website_id: "w1" });
});
