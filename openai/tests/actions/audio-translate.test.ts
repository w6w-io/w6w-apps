import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audio-translate.ts";

const AUDIO_B64 = "aGVsbG8=";

Deno.test("audio-translate: POSTs multipart to /audio/translations with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { text: "hi" } }]);
  await action.execute!({ file: AUDIO_B64 }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/audio/translations");
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("model"), "whisper-1");
  assertEquals(form.get("response_format"), "json");
  assertEquals((form.get("file") as File).name, "audio.mp3");
});
