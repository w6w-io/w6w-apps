import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/hook-create.ts";

Deno.test("hook-create: sends Recording Include for recording_added", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "h1", hook_type: "recording_added" } }]);
  await action.execute({
    hookUrl: "https://example.com/hook",
    hookType: "recording_added",
    includeHighlights: true,
    includeHighlightTranscript: true, // should be ignored for a recording_* hook
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/hooks/create");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    hook_url: "https://example.com/hook",
    hook_type: "recording_added",
    include: { highlights: true },
  });
});

Deno.test("hook-create: sends Highlight Include for highlight_updated", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "h1" } }]);
  await action.execute({
    hookUrl: "https://example.com/hook",
    hookType: "highlight_updated",
    includeHighlightTranscript: true,
    includeHighlightSpeakers: true,
    includeHighlights: true, // should be ignored for a highlight_* hook
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    hook_url: "https://example.com/hook",
    hook_type: "highlight_updated",
    include: { transcript: true, speakers: true },
  });
});

Deno.test("hook-create: omits include entirely for a type documented as N/A", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "h1" } }]);
  await action.execute({
    hookUrl: "https://example.com/hook",
    hookType: "upload_status",
    includeHighlights: true,
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { hook_url: "https://example.com/hook", hook_type: "upload_status" });
});

Deno.test("hook-create: exposes all 10 documented hook types", () => {
  const options = action.params?.find((p) => p.key === "hookType")?.options;
  assertEquals(Array.isArray(options) ? options.length : 0, 10);
});

Deno.test("hook-create: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
