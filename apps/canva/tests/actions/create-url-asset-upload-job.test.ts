import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-url-asset-upload-job.ts";

Deno.test("create-url-asset-upload-job: POSTs name and url as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: { id: "job1", status: "in_progress" } } }]);
  const result = await action.execute({
    name: "My Asset",
    url: "https://example.com/asset.jpg",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/url-asset-uploads");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "My Asset",
    url: "https://example.com/asset.jpg",
  });
  assertEquals(result, { id: "job1", status: "in_progress" });
});
