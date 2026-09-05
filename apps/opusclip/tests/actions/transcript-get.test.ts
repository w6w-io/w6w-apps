import { assertEquals } from "@std/assert";
import transcriptGet from "../../actions/transcript-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transcript-get: queries q=findByProjectId and unwraps data[0]", async () => {
  const paragraph = { id: 0, start: 0, end: 10.5, text: "Hello", words: [] };
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [[paragraph]] } }]);
  const out = await transcriptGet.execute({ projectId: "P1" }, ctx) as {
    paragraphs: unknown[] | null;
  };

  assertEquals(pathOf(calls[0].url), "/api/transcripts");
  assertEquals(queryOf(calls[0].url), { q: "findByProjectId", projectId: "P1" });
  assertEquals(out.paragraphs, [paragraph]);
});

Deno.test("transcript-get: a project with no transcript yet returns null, not undefined or []", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [null] } }]);
  const out = await transcriptGet.execute({ projectId: "P1" }, ctx) as { paragraphs: unknown };
  assertEquals(out.paragraphs, null);
});
