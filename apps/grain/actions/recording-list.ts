import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import {
  buildRecordingInclude,
  cursorParam,
  recordingFilterParams,
  recordingIncludeParams,
  recordingListOutput,
} from "../lib/params.ts";

interface Output {
  cursor: string | null;
  recordings: unknown[];
}

/**
 * `POST /_/public-api/v2/recordings` — the workspace's (or, with a Personal
 * token, your own) recordings, cursor-paginated.
 *
 * The request body carries `cursor`, `filter` and `include` as nested
 * objects — this action's flat `filter*`/`include*` params are assembled
 * into that shape in `execute`. `cursor` (from a previous response's
 * `cursor` field) is echoed back as a top-level body field, not a query
 * param: this is a `POST`, not a `GET`.
 */
const recordingList: ActionDefinition<Record<string, unknown>, Output> = {
  key: "recording-list",
  type: "search",
  resource: "recording",
  title: "List Recordings",
  description: "List recordings visible to this credential, with optional filtering and includes.",
  params: [cursorParam, ...recordingFilterParams, ...recordingIncludeParams],
  output: recordingListOutput,

  async execute(input, ctx) {
    const filter: Record<string, unknown> = {};
    if (input.filterBeforeDatetime) filter.before_datetime = input.filterBeforeDatetime;
    if (input.filterAfterDatetime) filter.after_datetime = input.filterAfterDatetime;
    if (input.filterAttendance) filter.attendance = input.filterAttendance;
    if (input.filterParticipantScope) filter.participant_scope = input.filterParticipantScope;
    if (input.filterTitleSearch) filter.title_search = input.filterTitleSearch;
    if (input.filterTeam) filter.team = input.filterTeam;
    if (input.filterMeetingType) filter.meeting_type = input.filterMeetingType;

    const body: Record<string, unknown> = {};
    if (input.cursor) body.cursor = input.cursor;
    if (Object.keys(filter).length > 0) body.filter = filter;
    const include = buildRecordingInclude(input);
    if (include) body.include = include;

    const res = await new GrainClient(ctx).request<
      { cursor?: string | null; recordings?: unknown[] }
    >("/v2/recordings", { method: "POST", body });
    return { cursor: res?.cursor ?? null, recordings: res?.recordings ?? [] };
  },
};

export default recordingList;
