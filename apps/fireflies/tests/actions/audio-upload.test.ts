import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/audio-upload.ts";

const OK = { data: { uploadAudio: { success: true, title: "call.mp3" } } };

Deno.test("audio-upload: wraps everything in the AudioUploadInput object", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ url: "https://cdn.example.com/a.mp3", title: "Call" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation UploadAudio($input: AudioUploadInput)"));
  assertEquals(variables.input, { url: "https://cdn.example.com/a.mp3", title: "Call" });
});

Deno.test("audio-upload: maps form field names onto the vendor's snake_case input", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({
    url: "https://cdn.example.com/a.mp3",
    customLanguage: "es",
    saveVideo: true,
    clientReferenceId: "ref-1",
    webhook: "https://hooks.example.com/ff",
    bypassSizeCheck: true,
  }, ctx);
  assertEquals(sent(calls[0]).variables.input, {
    url: "https://cdn.example.com/a.mp3",
    custom_language: "es",
    save_video: true,
    client_reference_id: "ref-1",
    webhook: "https://hooks.example.com/ff",
    bypass_size_check: true,
  });
});

Deno.test("audio-upload: attendee emails become attendee objects", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ url: "https://x/a.mp3", attendeeEmails: "a@b.com, c@d.com" }, ctx);
  const input = sent(calls[0]).variables.input as { attendees: unknown };
  assertEquals(input.attendees, [{ email: "a@b.com" }, { email: "c@d.com" }]);
});

Deno.test("audio-upload: takes no media-host credential and is not idempotent", () => {
  // `download_auth` is deliberately unexposed: a third-party credential does
  // not belong in Action params, where it would be stored with the workflow.
  assertEquals(action.params!.some((p) => p.key.toLowerCase().includes("auth")), false);
  assertEquals(action.params!.some((p) => p.type === "secret"), false);
  // `client_reference_id` is an echo field, not a dedupe key, so a retry
  // transcribes the same file twice.
  assertEquals(action.idempotent, false);
});
