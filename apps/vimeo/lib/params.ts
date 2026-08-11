import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Vimeo actions.
 *
 * Every enum below is copied verbatim from the option list the vendor's own
 * reference publishes for that parameter (read 2026-08-11 from the OpenAPI
 * documents embedded in `developer.vimeo.com/api/reference/*`). Where two
 * endpoints accept different subsets of the same-looking enum — `sort` is a
 * different list on `/me/videos`, `/videos`, `/me/albums` and
 * `/me/albums/{id}/videos`, and `privacy.view` differs between the video body
 * and the user body — they are separate constants rather than one averaged
 * list, because the API rejects an out-of-range value rather than ignoring it.
 */

/** `asc` / `desc`, identical on every sortable endpoint. */
export const directionOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

/**
 * The pagination pair, identical on every collection endpoint.
 *
 * Vimeo pages by number, not cursor: `page` and `per_page`, with `per_page`
 * defaulting to 25 and capped at 100 (`/api/common-formats#representations`).
 * Asking for a page past the end is a **404**, not an empty collection, which
 * is why the hint says to walk `paging.next` from the previous response rather
 * than incrementing blindly.
 */
export const paginationParams: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    validation: { integer: true, min: 1 },
    hint: "Requesting a page past the end returns a 404, not an empty list — prefer following " +
      "`paging.next` from the previous response.",
  },
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    validation: { integer: true, min: 1, max: 100 },
    hint: "Default 25, maximum 100.",
  },
];

/**
 * The `fields` filter.
 *
 * Not a micro-optimisation. Vimeo **doubles** the per-minute request quota for
 * any call that uses it, and reports `X-RateLimit-Limit` / `-Remaining` as the
 * already-doubled figure regardless (`/guidelines/rate-limiting`). It is also
 * the only supported way to keep a cleartext password out of a response: the
 * video representation returns `password` at the top level, the showcase
 * representation returns `privacy.password`, and `/me` returns
 * `preferences.videos.password`.
 */
export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  placeholder: "uri,name,link,duration",
  hint: "Comma-separated list of fields to return; dot notation for nested paths " +
    "(`metadata.connections.likes`). Doubles your per-minute request quota, and is the " +
    "supported way to avoid pulling back cleartext privacy passwords, which the video, " +
    "showcase and user representations all include by default.",
};

/** `sort` on `GET /me/videos` and `GET /me/projects/{id}/videos`. */
export const videoSortOptions = [
  { value: "alphabetical", label: "Alphabetical — by title" },
  { value: "date", label: "Date" },
  { value: "default", label: "Default" },
  { value: "duration", label: "Duration" },
  { value: "last_user_action_event_date", label: "Last user interaction" },
  { value: "likes", label: "Likes" },
  { value: "modified_time", label: "Last modified" },
  { value: "plays", label: "Plays" },
];

/** `sort` on the public `GET /videos` search — a different list, note `relevant`. */
export const videoSearchSortOptions = [
  { value: "alphabetical", label: "Alphabetical" },
  { value: "comments", label: "Comments" },
  { value: "date", label: "Date" },
  { value: "duration", label: "Duration" },
  { value: "likes", label: "Likes" },
  { value: "plays", label: "Plays" },
  { value: "relevant", label: "Relevance" },
];

/** `sort` on `GET /me/albums`. */
export const showcaseSortOptions = [
  { value: "alphabetical", label: "Alphabetical" },
  { value: "date", label: "Date created" },
  { value: "duration", label: "Duration" },
  { value: "last_modified", label: "Last modified" },
  { value: "videos", label: "Number of videos" },
];

/** `sort` on `GET /me/albums/{album_id}/videos` — adds `manual`. */
export const showcaseVideoSortOptions = [
  { value: "alphabetical", label: "Alphabetical" },
  { value: "comments", label: "Comments" },
  { value: "date", label: "Date" },
  { value: "default", label: "Default" },
  { value: "duration", label: "Duration" },
  { value: "likes", label: "Likes" },
  { value: "manual", label: "Manual — the showcase's arranged order" },
  { value: "modified_time", label: "Last modified" },
  { value: "plays", label: "Plays" },
];

/** `sort` on `GET /me/projects`. */
export const folderSortOptions = [
  { value: "date", label: "Date" },
  { value: "default", label: "Default" },
  { value: "modified_time", label: "Last modified" },
  { value: "name", label: "Name" },
  { value: "pinned_on", label: "Pinned date" },
];

/** `sort` on `GET /me/projects/{id}/items`. */
export const folderItemSortOptions = [
  { value: "alphabetical", label: "Alphabetical" },
  { value: "date", label: "Date" },
  { value: "default", label: "Default" },
  { value: "duration", label: "Duration" },
  { value: "last_user_action_event_date", label: "Last user interaction" },
];

/** `filter` on `GET /me/projects/{id}/items`. */
export const folderItemFilterOptions = [
  { value: "folder", label: "Folders only" },
  { value: "live_event", label: "Events only" },
  { value: "video", label: "Videos only" },
];

/** `query_fields` on the video list endpoints. */
export const queryFieldsOptions = [
  { value: "title", label: "Title" },
  { value: "description", label: "Description" },
  { value: "chapters", label: "Chapter titles" },
  { value: "tags", label: "Tag names" },
];

/**
 * `privacy.view` on the **video** body — the settable subset.
 *
 * The video *response* schema publishes a wider enum (it also reports
 * `cold_storage`, `ptv`, `ptvhide`, `stock`, `stock_purchased`), but those are
 * states Vimeo assigns, not values `PATCH /videos/{id}` accepts. Only the
 * documented request enum is offered here.
 */
export const videoPrivacyViewOptions = [
  { value: "anybody", label: "Anybody — public" },
  { value: "contacts", label: "Contacts only" },
  { value: "disable", label: "Disable — embed-only, hidden on Vimeo" },
  { value: "nobody", label: "Nobody" },
  { value: "password", label: "Password — requires the Password field below" },
  { value: "team", label: "Team" },
  { value: "unlisted", label: "Unlisted" },
  { value: "users", label: "Vimeo users only" },
];

/** `privacy.embed` on the video body. */
export const videoPrivacyEmbedOptions = [
  { value: "private", label: "Private — cannot be embedded" },
  { value: "public", label: "Public — embeddable anywhere" },
  { value: "whitelist", label: "Allowlist — only the domains you name" },
];

/** `privacy.comments` on the video body. */
export const commentPrivacyOptions = [
  { value: "anybody", label: "Anybody" },
  { value: "contacts", label: "Contacts only" },
  { value: "nobody", label: "Nobody" },
];

/** `license` on the video body — Creative Commons codes. */
export const licenseOptions = [
  { value: "by", label: "CC BY — attribution" },
  { value: "by-nc", label: "CC BY-NC — attribution, non-commercial" },
  { value: "by-nc-nd", label: "CC BY-NC-ND — attribution, non-commercial, no derivatives" },
  { value: "by-nc-sa", label: "CC BY-NC-SA — attribution, non-commercial, share-alike" },
  { value: "by-nd", label: "CC BY-ND — attribution, no derivatives" },
  { value: "by-sa", label: "CC BY-SA — attribution, share-alike" },
  { value: "cc0", label: "CC0 — public domain" },
];

/** `privacy` on the **showcase** body. A different vocabulary from a video's. */
export const showcasePrivacyOptions = [
  { value: "anybody", label: "Anybody — on Vimeo or embedded" },
  { value: "embed_only", label: "Embed only — hidden on Vimeo, embeddable elsewhere" },
  { value: "nobody", label: "Nobody — not even the owner" },
  { value: "password", label: "Password — requires the Password field" },
  { value: "team", label: "Team" },
  { value: "unlisted", label: "Unlisted" },
];

/** `sort` on the showcase body — the showcase's own default video order. */
export const showcaseContentSortOptions = [
  { value: "added_first", label: "Recently added first" },
  { value: "added_last", label: "Recently added last" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "alphabetical_desc", label: "Alphabetical, descending" },
  { value: "arranged", label: "Arranged — the manual order" },
  { value: "comments", label: "Comments" },
  { value: "likes", label: "Likes" },
  { value: "modified_time_asc", label: "Last modified, ascending" },
  { value: "modified_time_desc", label: "Last modified, descending" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "plays", label: "Plays" },
];

/** `layout` and `theme` on the showcase body. */
export const showcaseLayoutOptions = [
  { value: "grid", label: "Grid" },
  { value: "player", label: "Player" },
];

export const showcaseThemeOptions = [
  { value: "dark", label: "Dark" },
  { value: "standard", label: "Standard" },
];

/** The video-id path param, accepted as an id or a `/videos/{id}` URI. */
export const videoIdParam: Param = {
  key: "videoId",
  label: "Video ID",
  type: "string",
  required: true,
  placeholder: "258684937",
  hint: "The numeric video ID. A full `/videos/258684937` URI from a previous step also works.",
};

/** The folder-id path param. Vimeo calls it a folder in the UI and a project in the URL. */
export const folderIdParam: Param = {
  key: "folderId",
  label: "Folder ID",
  type: "string",
  required: true,
  placeholder: "12345",
  hint: "The numeric folder ID. Folders are `projects` in the API path — a folder's URI looks " +
    "like `/users/152184/projects/12345`, and pasting that whole URI works too.",
};

/** The showcase-id path param. */
export const showcaseIdParam: Param = {
  key: "showcaseId",
  label: "Showcase ID",
  type: "string",
  required: true,
  placeholder: "3706071",
  hint: "The numeric showcase ID. Showcase endpoints live under `/albums`, but a showcase's own " +
    "URI is `/showcases/3706071` — either form works here.",
};
