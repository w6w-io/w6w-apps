import { assertEquals } from "@std/assert";
import questionCreate from "../../actions/question-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("question-create: builds the external-media body with wire field names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { question_id: "q1" } }]);
  await questionCreate.execute(
    {
      formId: "f1",
      mediaType: "video",
      mediaUrl: "https://example.com/video.mp4",
      thumbnailUrl: "https://example.com/thumb.gif",
      allowedAnswerMediaTypes: ["video", "audio", "text"],
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/questions");
  assertEquals(JSON.parse(calls[0].body!), {
    form_id: "f1",
    media_type: "video",
    media_url: "https://example.com/video.mp4",
    thumbnail_url: "https://example.com/thumb.gif",
    allowed_answer_media_types: ["video", "audio", "text"],
  });
});

Deno.test("question-create: accepts a comma-separated multiselect string too", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await questionCreate.execute(
    {
      formId: "f1",
      mediaType: "audio",
      mediaUrl: "https://example.com/a.mp3",
      allowedAnswerMediaTypes: "video, text" as unknown as string[],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.allowed_answer_media_types, ["video", "text"]);
});
