import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-asset-upload-job.ts";

Deno.test("create-asset-upload-job: POSTs raw bytes with a base64 name header", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: { id: "job1", status: "in_progress" } } }]);
  // "hi" base64-encoded is "aGk=".
  const result = await action.execute({ name: "My Upload", file: "aGk=" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/asset-uploads");
  assertEquals(calls[0].body, "hi");
  const metadata = JSON.parse(calls[0].headers["asset-upload-metadata"]);
  // "My Upload" base64-encoded.
  assertEquals(atob(metadata.name_base64), "My Upload");
  assertEquals(result, { id: "job1", status: "in_progress" });
});

Deno.test("create-asset-upload-job: accepts a data: URL and strips the prefix before decoding", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: { id: "job2", status: "in_progress" } } }]);
  await action.execute({ name: "pic.png", file: "data:image/png;base64,aGk=" }, ctx);
  assertEquals(calls[0].body, "hi");
});
