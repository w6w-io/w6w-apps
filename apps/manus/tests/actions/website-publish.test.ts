import { assertEquals } from "@std/assert";
import websitePublish from "../../actions/website-publish.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("website-publish: posts task_id/website_id/visibility, only what's set", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ website_id: "w1", version_id: "v2" }) }]);
  const out = await websitePublish.execute({ taskId: "t1", visibility: "team" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/website.publish");
  assertEquals(JSON.parse(calls[0].body!), { task_id: "t1", visibility: "team" });
  assertEquals(out.version_id, "v2");
});

Deno.test("website-publish: is idempotent — always redeploys the same latest checkpoint", () => {
  assertEquals(websitePublish.idempotent, true);
});
