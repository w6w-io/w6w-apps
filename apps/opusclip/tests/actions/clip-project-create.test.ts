import { assert, assertEquals } from "@std/assert";
import clipProjectCreate from "../../actions/clip-project-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("clip-project-create: POSTs the minimal body for a bare videoUrl", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "P1", stage: "QUEUED", model: "ClipBasic" } },
  ]);
  await clipProjectCreate.execute({ videoUrl: "https://youtube.com/watch?v=x" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/clip-projects");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { videoUrl: "https://youtube.com/watch?v=x" });
});

Deno.test("clip-project-create: assembles nested curationPref/renderPref/conclusionActions", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "P2" } }]);
  await clipProjectCreate.execute({
    videoUrl: "https://youtube.com/watch?v=x",
    title: "My Title",
    brandTemplateId: "preset-fancy-Karaoke",
    curationModel: "ClipAnything",
    clipDurationMinSec: 0,
    clipDurationMaxSec: 90,
    customPrompt: "funny moments",
    genre: "Comedy",
    rangeStartSec: 10,
    rangeEndSec: 300,
    skipCurate: false,
    enableAutoHook: true,
    sourceLang: "en",
    layoutAspectRatio: "square",
    webhookUrl: "https://example.com/hook",
    webhookNotifyFailure: true,
    notifyEmail: "a@b.com",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.videoUrl, "https://youtube.com/watch?v=x");
  assertEquals(body.brandTemplateId, "preset-fancy-Karaoke");
  assertEquals(body.uploadedVideoAttr, { title: "My Title" });
  assertEquals(body.importPref, { sourceLang: "en" });
  assertEquals(body.renderPref, { layoutAspectRatio: "square" });
  assertEquals(body.curationPref.model, "ClipAnything");
  assertEquals(body.curationPref.clipDurations, [[0, 90]]);
  assertEquals(body.curationPref.customPrompt, "funny moments");
  assertEquals(body.curationPref.genre, "Comedy");
  assertEquals(body.curationPref.range, { startSec: 10, endSec: 300 });
  assertEquals(body.curationPref.skipCurate, false);
  assertEquals(body.curationPref.enableAutoHook, true);
  assertEquals(body.conclusionActions, [
    { type: "WEBHOOK", url: "https://example.com/hook", notifyFailure: true },
    { type: "EMAIL", email: "a@b.com", notifyFailure: false },
  ]);
});

Deno.test("clip-project-create: omits clipDurations/range unless both bounds are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "P3" } }]);
  await clipProjectCreate.execute({
    videoUrl: "https://youtube.com/watch?v=x",
    clipDurationMinSec: 0, // no max — incomplete pair
    rangeEndSec: 300, // no start — incomplete pair
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assert(!("curationPref" in body), "an incomplete pair must not produce a curationPref at all");
});

Deno.test("clip-project-create: is declared non-idempotent", () => {
  assertEquals(clipProjectCreate.idempotent, false);
});
