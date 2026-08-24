/**
 * Params, option vocabularies and output shapes shared across Grain's
 * endpoints. Every field, enum and description here is transcribed from
 * `https://developers.grain.com/` (fetched 2026-08-24) — none are guesses.
 */
import type { OutputField, Param } from "@w6w/types";

/** `recording_id` — the UUID path segment on every recording-scoped endpoint. */
export const recordingIdParam: Param = {
  key: "recordingId",
  label: "Recording ID",
  type: "string",
  required: true,
  hint: "UUID from List Recordings.",
  placeholder: "pppp6666-qq77-rr88-ss99-tttt00000000",
};

/** `user_id` — a workspace user's UUID, from List Users. */
export const userIdParam: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  required: true,
  hint: "UUID from List Users.",
  placeholder: "7890-abcd-ef01-2222-3456-7890ffff",
};

/** `team_id` — a workspace team's UUID, from List Teams. */
export const teamIdParam: Param = {
  key: "teamId",
  label: "Team ID",
  type: "string",
  required: true,
  hint: "UUID from List Teams.",
  placeholder: "aaaa1111-bb22-cc33-dd44-eeee55555555",
};

/**
 * `tag` — validated to Grain's own regex (linked from the docs via
 * regex101.com/r/ZYrnZV): `/^[\p{L}\d][\p{L}\d-]*$/u` — letters and numbers,
 * optionally followed by more letters/numbers/dashes.
 */
export const tagParam: Param = {
  key: "tag",
  label: "Tag",
  type: "string",
  required: true,
  validation: { pattern: "^[\\p{L}\\d][\\p{L}\\d-]*$" },
  hint: "Letters and numbers, optionally followed by more letters, numbers or dashes " +
    "(Grain's own format: /^[\\p{L}\\d][\\p{L}\\d-]*$/u), e.g. my-new-tag.",
  placeholder: "my-new-tag",
};

/**
 * Grain's only pagination form: an opaque cursor echoed back from a previous
 * `List Recordings` response's `cursor` field (a request-body field here, not
 * a query param — this is a `POST` endpoint).
 */
export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "Opaque cursor from a previous page's `cursor` field. Leave empty for the first page.",
};

/**
 * Recording Filter (`List Recordings` only).
 *
 * **Known doc inconsistency, verified 2026-08-24**: Grain's own descriptions
 * for `before_datetime` and `after_datetime` are swapped relative to their
 * names — the docs state `before_datetime` matches recordings "after the
 * selected date" and `after_datetime` matches recordings "before the
 * selected date". That is almost certainly a copy-paste error between two
 * adjacent, near-identical field blocks, not the intended behavior, so these
 * params are labelled and hinted by what the field NAME says rather than the
 * (swapped) prose — verify against a live response before relying on the
 * boundary being inclusive/exclusive exactly as hinted.
 */
export const recordingFilterParams: Param[] = [
  {
    key: "filterBeforeDatetime",
    label: "Started before",
    type: "datetime",
    hint:
      "Only recordings whose start_datetime is before this instant, e.g. 2025-01-01T09:30:00Z. " +
      "Grain's docs swap this description with `filterAfterDatetime`'s — the field NAME is trusted here.",
  },
  {
    key: "filterAfterDatetime",
    label: "Started after",
    type: "datetime",
    hint:
      "Only recordings whose start_datetime is after this instant, e.g. 2025-01-01T09:30:00Z. " +
      "Grain's docs swap this description with `filterBeforeDatetime`'s — the field NAME is trusted here.",
  },
  {
    key: "filterAttendance",
    label: "Attendance (Personal API only)",
    type: "select",
    options: [
      { value: "hosted", label: "Hosted — I was the meeting host" },
      { value: "attended", label: "Attended — I attended the meeting" },
    ],
    hint: "Only meaningful when authenticated with a Personal Access Token or OAuth2 token.",
  },
  {
    key: "filterParticipantScope",
    label: "Participant scope",
    type: "select",
    options: [
      { value: "internal", label: "Internal — internal / team meetings" },
      { value: "external", label: "External — customer meetings" },
    ],
  },
  {
    key: "filterTitleSearch",
    label: "Title search",
    type: "string",
    hint: "Only return recordings whose title matches this search string.",
  },
  {
    key: "filterTeam",
    label: "Team ID",
    type: "string",
    hint: "UUID from List Teams.",
  },
  {
    key: "filterMeetingType",
    label: "Meeting type ID",
    type: "string",
    hint: "UUID from List Meeting Types.",
  },
];

/**
 * Recording Include — shared by `List Recordings`, `Get Recording`, and (a
 * subset, for `recording_added`/`recording_updated`) `Create Hook`.
 */
export const recordingIncludeParams: Param[] = [
  {
    key: "includeHighlights",
    label: "Include highlights",
    type: "boolean",
    default: false,
    hint: "Include clips / highlights in the response.",
  },
  {
    key: "includeParticipants",
    label: "Include participants",
    type: "boolean",
    default: false,
  },
  {
    key: "includeAiActionItems",
    label: "Include AI action items",
    type: "boolean",
    default: false,
  },
  {
    key: "includeAiSummary",
    label: "Include AI summary",
    type: "boolean",
    default: false,
  },
  {
    key: "includePrivateNotes",
    label: "Include private notes (Personal API only)",
    type: "boolean",
    default: false,
    hint: "Your own private notes. Only meaningful when authenticated with a Personal Access " +
      "Token or OAuth2 token.",
  },
  {
    key: "includeCalendarEvent",
    label: "Include calendar event",
    type: "boolean",
    default: false,
  },
  {
    key: "includeHubspot",
    label: "Include HubSpot data",
    type: "boolean",
    default: false,
  },
  {
    key: "includeScreenshares",
    label: "Include screenshare ranges",
    type: "boolean",
    default: false,
  },
  {
    key: "includeAiTemplateSections",
    label: "Include AI template sections",
    type: "boolean",
    default: false,
  },
  {
    key: "aiTemplateSectionsFormat",
    label: "AI template sections format",
    type: "select",
    options: [
      { value: "json", label: "JSON" },
      { value: "markdown", label: "Markdown" },
      { value: "text", label: "Text" },
    ],
    default: "json",
    hint: "Only applies when Include AI template sections is on. Grain defaults to json.",
  },
  {
    key: "aiTemplateSectionsAllowedSections",
    label: "AI template sections — allowed titles",
    type: "multiselect",
    hint:
      "Only include sections whose title matches one of these (case-insensitive). Leave empty " +
      "for all sections. Only applies when Include AI template sections is on.",
  },
];

/** Build the `include` request object for a Recording Include param set, or `undefined` if empty. */
export function buildRecordingInclude(
  input: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const include: Record<string, unknown> = {};
  if (input.includeHighlights === true) include.highlights = true;
  if (input.includeParticipants === true) include.participants = true;
  if (input.includeAiActionItems === true) include.ai_action_items = true;
  if (input.includeAiSummary === true) include.ai_summary = true;
  if (input.includePrivateNotes === true) include.private_notes = true;
  if (input.includeCalendarEvent === true) include.calendar_event = true;
  if (input.includeHubspot === true) include.hubspot = true;
  if (input.includeScreenshares === true) include.screenshares = true;
  if (input.includeAiTemplateSections === true) {
    const section: Record<string, unknown> = {};
    if (input.aiTemplateSectionsFormat) section.format = input.aiTemplateSectionsFormat;
    const allowed = input.aiTemplateSectionsAllowedSections;
    if (Array.isArray(allowed) && allowed.length > 0) section.allowed_sections = allowed;
    include.ai_template_sections = section;
  }
  return Object.keys(include).length > 0 ? include : undefined;
}

/**
 * Highlight Include — the subset of `Create Hook`'s `include` that applies to
 * `highlight_added` / `highlight_updated`.
 */
export const highlightIncludeParams: Param[] = [
  {
    key: "includeHighlightTranscript",
    label: "Include highlight transcript",
    type: "boolean",
    default: false,
    hint: "Only applies to the highlight_added / highlight_updated hook types.",
  },
  {
    key: "includeHighlightSpeakers",
    label: "Include highlight speakers",
    type: "boolean",
    default: false,
    hint: "Only applies to the highlight_added / highlight_updated hook types.",
  },
];

export function buildHighlightInclude(
  input: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const include: Record<string, unknown> = {};
  if (input.includeHighlightTranscript === true) include.transcript = true;
  if (input.includeHighlightSpeakers === true) include.speakers = true;
  return Object.keys(include).length > 0 ? include : undefined;
}

/** The 10 documented `hook_type` values. */
export const HOOK_TYPES = [
  "recording_added",
  "recording_updated",
  "recording_deleted",
  "highlight_added",
  "highlight_updated",
  "highlight_deleted",
  "story_added",
  "story_updated",
  "story_deleted",
  "upload_status",
] as const;

export const hookTypeOptions = HOOK_TYPES.map((v) => ({ value: v, label: v }));

export const hookStateOptions = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

/** The `output` block for the two `success: true`-only endpoints. */
export const successOutput: OutputField[] = [
  { key: "success", type: "boolean", label: "Always true on success" },
];

/** The `output` block for `List Recordings`. */
export const recordingListOutput: OutputField[] = [
  { key: "cursor", type: "string", label: "Cursor for the next page (null on the last page)" },
  { key: "recordings", type: "array", label: "Recordings" },
];

/** The `output` block for `Get Recording` and (nested) the shape of each `recordings[]` entry. */
export const recordingOutput: OutputField[] = [
  { key: "id", type: "string", label: "Recording ID" },
  { key: "title", type: "string", label: "Title" },
  {
    key: "source",
    type: "string",
    label: "Source (zoom, meet, teams, webex, aircall, local_capture, upload, other)",
  },
  { key: "share_state", type: "string", label: "Share state (public, workspace, restricted)" },
  { key: "url", type: "string", label: "URL to the recording in Grain" },
  { key: "media_type", type: "string", label: "Media type (audio, video, transcript)" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "start_datetime", type: "string", label: "Start datetime (ISO 8601)" },
  { key: "end_datetime", type: "string", label: "End datetime (ISO 8601)" },
  { key: "duration_ms", type: "number", label: "Duration in ms" },
  { key: "thumbnail_url", type: "string", label: "Thumbnail URL" },
  { key: "teams", type: "array", label: "Teams the recording belongs to" },
  { key: "recorders", type: "array", label: "Users who recorded the meeting" },
  { key: "meeting_type", type: "object", label: "Meeting type" },
  { key: "highlights", type: "array", label: "Highlights / clips" },
  { key: "participants", type: "array", label: "Participants — when include.participants" },
  { key: "ai_action_items", type: "array", label: "Action items — when include.ai_action_items" },
  { key: "ai_summary", type: "object", label: "AI summary — when include.ai_summary" },
  {
    key: "ai_template_sections",
    type: "array",
    label: "AI template sections — when include.ai_template_sections",
  },
  { key: "calendar_event", type: "object", label: "Calendar event — when include.calendar_event" },
  { key: "hubspot", type: "object", label: "HubSpot data — when include.hubspot" },
  {
    key: "private_notes",
    type: "object",
    label: "Private notes — Personal API + include.private_notes",
  },
  {
    key: "screenshares",
    type: "array",
    label: "Screenshare ranges — when include.screenshares",
  },
];

/** The `output` block for `Create Hook` / `Delete Hook`'s hook object, and `List Hooks`' entries. */
export const hookOutput: OutputField[] = [
  { key: "id", type: "string", label: "Hook ID" },
  { key: "enabled", type: "boolean", label: "Whether the hook is enabled" },
  { key: "hook_url", type: "string", label: "URL Grain posts to" },
  { key: "hook_type", type: "string", label: "Event type this hook fires for" },
  {
    key: "include",
    type: "object",
    label: "Recording/Highlight Include the hook was created with",
  },
  { key: "inserted_at", type: "string", label: "Created at (ISO 8601)" },
];
