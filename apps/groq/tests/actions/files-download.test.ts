import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { base64ToBytes } from "../../lib/client.ts";
import action from "../../actions/files-download.ts";

Deno.test("files-download: GETs /openai/v1/files/{id}/content and base64-encodes the body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: '{"custom_id":"1"}',
    headers: { "content-type": "application/octet-stream" },
  }]);
  const result = await action.execute!({ fileId: "file-out-1" }, ctx) as {
    base64: string;
    contentType: string;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/files/file-out-1/content");
  assertEquals(result.contentType, "application/octet-stream");
  assertEquals(new TextDecoder().decode(base64ToBytes(result.base64)), '{"custom_id":"1"}');
});
