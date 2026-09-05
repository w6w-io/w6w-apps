import { assertEquals } from "@std/assert";
import websiteListCheckpoints from "../../actions/website-list-checkpoints.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("website-list-checkpoints: sends website_id, returns website_id/data/published_version_id", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({
      website_id: "w1",
      data: [{ version_id: "v1", status: "success" }],
      published_version_id: "v1",
    }),
  }]);
  const out = await websiteListCheckpoints.execute({ websiteId: "w1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/website.listCheckpoints");
  assertEquals(queryOf(calls[0].url), { website_id: "w1" });
  assertEquals(out, {
    website_id: "w1",
    data: [{ version_id: "v1", status: "success" }],
    published_version_id: "v1",
  });
});

Deno.test("website-list-checkpoints: is a read action (not paginated)", () => {
  assertEquals(websiteListCheckpoints.type, "read");
});
