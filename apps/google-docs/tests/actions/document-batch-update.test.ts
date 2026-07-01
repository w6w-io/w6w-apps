import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-batch-update.ts";

Deno.test("document-batch-update: POSTs the raw requests array", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  const requests = [{ insertText: { text: "hi", endOfSegmentLocation: { segmentId: "" } } }];
  await action.execute!({ documentURL: "d-1", requests }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/documents/d-1:batchUpdate");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { requests });
});

Deno.test("document-batch-update: wraps writeControl into { control: value }", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    documentURL: "d-1",
    requests: [],
    writeControl: { control: "requiredRevisionId", value: "rev-42" },
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.writeControl, { requiredRevisionId: "rev-42" });
});
