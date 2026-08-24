import { assertEquals } from "@std/assert";
import { mockCtx, outputKeys } from "../_helpers.ts";
import action from "../../actions/recording-list.ts";

Deno.test("recording-list: POSTs /v2/recordings assembling filter and include objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { cursor: "next-cur", recordings: [{ id: "r1" }] } }]);
  const result = await action.execute({
    cursor: "cur1",
    filterBeforeDatetime: "2025-02-01T00:00:00Z",
    filterAfterDatetime: "2025-01-01T00:00:00Z",
    filterAttendance: "hosted",
    filterParticipantScope: "internal",
    filterTitleSearch: "hands",
    filterTeam: "team-1",
    filterMeetingType: "mt-1",
    includeHighlights: true,
    includeParticipants: true,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/_/public-api/v2/recordings");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.cursor, "cur1");
  assertEquals(body.filter, {
    before_datetime: "2025-02-01T00:00:00Z",
    after_datetime: "2025-01-01T00:00:00Z",
    attendance: "hosted",
    participant_scope: "internal",
    title_search: "hands",
    team: "team-1",
    meeting_type: "mt-1",
  });
  assertEquals(body.include, { highlights: true, participants: true });
  assertEquals(result, { cursor: "next-cur", recordings: [{ id: "r1" }] });
});

Deno.test("recording-list: sends no filter/include/cursor at all when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { cursor: null, recordings: [] } }]);
  await action.execute({}, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {});
});

Deno.test("recording-list: assembles ai_template_sections only when its include flag is on", async () => {
  const { ctx, calls } = mockCtx([{ body: { cursor: null, recordings: [] } }]);
  await action.execute({
    includeAiTemplateSections: true,
    aiTemplateSectionsFormat: "markdown",
    aiTemplateSectionsAllowedSections: ["Action Items"],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.include, {
    ai_template_sections: { format: "markdown", allowed_sections: ["Action Items"] },
  });
});

Deno.test("recording-list: defaults cursor to null and recordings to [] on a bodyless page", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({}, ctx);
  assertEquals(result, { cursor: null, recordings: [] });
});

Deno.test("recording-list: is a search action", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "recording");
  assertEquals(outputKeys(action), ["cursor", "recordings"]);
});
