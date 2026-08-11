import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Twitch actions.
 *
 * Every enum, ceiling and default here is copied from Twitch's API reference
 * (dev.twitch.tv/docs/api/reference/, read 2026-08-11), not inferred. Where the
 * vendor documents a different ceiling per endpoint — `first` maxes at 100
 * nearly everywhere but at 25 on Get Channel Stream Schedule — the value is
 * stated at the call site rather than averaged into one wrong number here.
 */

/**
 * `first` — page size.
 *
 * Twitch's own default is 20 on every endpoint in this app except Get Followed
 * Streams, where it is 100. Both are left alone: unlike vendors whose default
 * page is their maximum, 20 rows is a sane thing for a workflow step to hand to
 * the next one, so this param is offered without a prefilled value and Twitch's
 * default applies when it is left empty.
 */
export function firstParam(max = 100, def = 20): Param {
  return {
    key: "first",
    label: "Page size",
    type: "number",
    validation: { integer: true, min: 1, max },
    hint: `Items per page, 1–${max}. Twitch's default is ${def}.`,
  };
}

/**
 * `after` — the forward cursor.
 *
 * Twitch pages by opaque cursor, not by offset. The cursor comes from the
 * `pagination.cursor` field of the previous response, and `pagination` is `{}`
 * — an empty object, not a missing key — once there are no more pages.
 */
export const afterParam: Param = {
  key: "after",
  label: "Cursor (next page)",
  type: "string",
  hint: "The `pagination.cursor` value from the previous response. Leave empty for the first " +
    "page; the response's `pagination` object is empty once there are no more pages.",
};

/**
 * `before` — the backward cursor.
 *
 * Only offered on the endpoints whose documented parameter list includes it
 * (Get Streams, Get Clips, Get Videos, Get Top Games). Twitch's own guidance is
 * that paging backward requires keeping the previous cursor yourself, because
 * a forward page that reaches the end returns an empty `pagination` and loses
 * the way back.
 */
export const beforeParam: Param = {
  key: "before",
  label: "Cursor (previous page)",
  type: "string",
  hint: "The `pagination.cursor` value used to page backward. Not every list supports it.",
};

/**
 * The broadcaster whose resource is being read.
 *
 * This is a numeric Twitch **user id** as a string (`141981764`), never a login
 * name. Get Users translates a login into one, which is why nearly every
 * workflow using this app starts with that action.
 */
export function broadcasterIdParam(hint?: string): Param {
  return {
    key: "broadcasterId",
    label: "Broadcaster ID",
    type: "string",
    required: true,
    placeholder: "141981764",
    hint: hint ??
      "The broadcaster's numeric Twitch user ID, not their login name. Use the Get Users " +
        "action to turn a login into an ID.",
  };
}

/** `type` on Get Streams. */
export const streamTypeOptions = [
  { value: "all", label: "All (default)" },
  { value: "live", label: "Live only" },
];

/** `type` on Get Videos. Case-sensitive, per the reference. */
export const videoTypeOptions = [
  { value: "all", label: "All (default)" },
  { value: "archive", label: "Archive — VODs of past streams" },
  { value: "highlight", label: "Highlight — highlight reels" },
  { value: "upload", label: "Upload — externally uploaded video" },
];

/** `period` on Get Videos. */
export const videoPeriodOptions = [
  { value: "all", label: "All time (default)" },
  { value: "day", label: "Past day" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
];

/** `sort` on Get Videos. */
export const videoSortOptions = [
  { value: "time", label: "Time — newest first (default)" },
  { value: "trending", label: "Trending — biggest viewership gains first" },
  { value: "views", label: "Views — most viewed first" },
];

/** `color` on Send Chat Announcement. Case-sensitive, per the reference. */
export const announcementColorOptions = [
  { value: "primary", label: "Primary — the channel's accent colour (default)" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "purple", label: "Purple" },
];

/**
 * The six Content Classification Labels a broadcaster may set.
 *
 * Copied from the Modify Channel Information request body, which enumerates
 * them; Get Content Classification Labels returns a seventh, `MatureGame`, that
 * Twitch applies from the category and a broadcaster cannot set. Offering it
 * here would produce a request Twitch rejects, so it is left out.
 */
export const settableCclOptions = [
  { value: "DebatedSocialIssuesAndPolitics", label: "Politics and sensitive social issues" },
  { value: "DrugsIntoxication", label: "Drugs, intoxication or excessive tobacco use" },
  { value: "SexualThemes", label: "Sexual themes" },
  { value: "ViolentGraphic", label: "Violent and graphic depictions" },
  { value: "Gambling", label: "Gambling" },
  { value: "ProfanityVulgarity", label: "Significant profanity or vulgarity" },
];

/** The `{data, pagination}` output fields every cursor-paged list read shares. */
export const pagedOutput = [
  { key: "data", type: "array" as const, label: "Items" },
  { key: "pagination.cursor", type: "string" as const, label: "Next-page cursor" },
];
