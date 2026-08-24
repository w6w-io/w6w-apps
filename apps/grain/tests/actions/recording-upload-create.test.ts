import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-upload-create.ts";

Deno.test("recording-upload-create: POSTs filename and optional user_id", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      uuid: "up1",
      url: "https://example.com/generated_url",
      max_duration_sec: 10800,
      max_upload_bytes: 4294967296,
    },
  }]);
  const result = await action.execute({ filename: "recording.mp4", userId: "u1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/upload");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { filename: "recording.mp4", user_id: "u1" });
  assertEquals(result, {
    uuid: "up1",
    url: "https://example.com/generated_url",
    maxDurationSec: 10800,
    maxUploadBytes: 4294967296,
  });
});

Deno.test("recording-upload-create: omits user_id when not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { uuid: "up1", url: "https://example.com/x", max_duration_sec: 1, max_upload_bytes: 1 },
  }]);
  await action.execute({ filename: "a.mp4" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { filename: "a.mp4" });
});

Deno.test("recording-upload-create: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
