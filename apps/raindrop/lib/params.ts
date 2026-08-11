import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Raindrop actions.
 *
 * Every enum here is transcribed from Raindrop's reference (fetched 2026-08-11
 * from `developer.raindrop.io`), not inferred.
 */

/**
 * `collectionId`, in the form every raindrop/tag/filter path takes.
 *
 * The three system collections are the part a caller cannot discover: the
 * reference states they "are not contained in any API responses", so nothing you
 * can list will ever mention `0`, `-1` or `-99`. They are spelled out in the
 * hint for exactly that reason.
 */
export function collectionIdParam(overrides: Partial<Param> = {}): Param {
  return {
    key: "collectionId",
    label: "Collection",
    type: "number",
    required: true,
    default: 0,
    validation: { integer: true },
    hint: "Collection ID, or a system collection: 0 = all (except Trash), -1 = Unsorted, " +
      "-99 = Trash. System collections never appear in a collection list, so they have to be " +
      "typed.",
    ...overrides,
  };
}

/**
 * The optional collection filter used by `/tags`, `/highlights` and the cover
 * search, where leaving the segment off means "across everything".
 */
export function optionalCollectionIdParam(hint: string): Param {
  return {
    key: "collectionId",
    label: "Collection",
    type: "number",
    validation: { integer: true },
    hint,
  };
}

/**
 * `sort` for the raindrop list.
 *
 * `score` is only meaningful alongside a `search` term; the vendor documents it
 * as "only applicable when search is specified", and it is labelled as such
 * rather than silently offered.
 */
export const raindropSortOptions = [
  { value: "-created", label: "Newest first (default)" },
  { value: "created", label: "Oldest first" },
  { value: "score", label: "Relevance — only with a search term" },
  { value: "-sort", label: "Manual order" },
  { value: "title", label: "Title A→Z" },
  { value: "-title", label: "Title Z→A" },
  { value: "domain", label: "Domain A→Z" },
  { value: "-domain", label: "Domain Z→A" },
];

/** `view` — how a collection renders. Enum from the Collections field table. */
export const collectionViewOptions = [
  { value: "list", label: "List (default)" },
  { value: "simple", label: "Simple" },
  { value: "grid", label: "Grid" },
  { value: "masonry", label: "Masonry — Pinterest-like grid" },
];

/** `type` — what a raindrop is. Enum from the Raindrops field table. */
export const raindropTypeOptions = [
  { value: "link", label: "Link" },
  { value: "article", label: "Article" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "audio", label: "Audio" },
];

/** Highlight colours. Twelve, exactly as documented; `yellow` is the default. */
export const highlightColorOptions = [
  { value: "yellow", label: "Yellow (default)" },
  { value: "blue", label: "Blue" },
  { value: "brown", label: "Brown" },
  { value: "cyan", label: "Cyan" },
  { value: "gray", label: "Gray" },
  { value: "green", label: "Green" },
  { value: "indigo", label: "Indigo" },
  { value: "orange", label: "Orange" },
  { value: "pink", label: "Pink" },
  { value: "purple", label: "Purple" },
  { value: "red", label: "Red" },
  { value: "teal", label: "Teal" },
];

/** Collaborator access levels, from the Sharing page. */
export const collaboratorRoleOptions = [
  { value: "member", label: "Member — write access, can invite others" },
  { value: "viewer", label: "Viewer — read-only" },
];

/**
 * `page` / `perpage`.
 *
 * **50 is the vendor's hard maximum** and it is enforced here rather than
 * discovered at runtime. The default is 25, which is what the vendor documents
 * for the highlight endpoints and a sane prefill for the rest — a workflow step
 * that silently returns everything is a footgun, not a convenience.
 */
export function paginationParams(hint = "Zero-based page number."): Param[] {
  return [
    {
      key: "perpage",
      label: "Per page",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 50 },
      hint: "How many records per page. Raindrop's maximum is 50.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 0 },
      hint,
    },
  ];
}

/**
 * The full-text `search` expression.
 *
 * Raindrop's search language (`#tag`, `type:article`, `created:2024`, `-word`,
 * quoted phrases) is documented for end users rather than in the API reference,
 * and the reference's own advice is to build the query in the Raindrop app and
 * paste it. The hint says that instead of half-transcribing an operator list
 * this app cannot keep current.
 */
export const searchParam: Param = {
  key: "search",
  label: "Search",
  type: "string",
  hint: "Raindrop's own search syntax — the same string you would type in the app's search box " +
    "(for example `#work type:article`). Test it in the app first: the API accepts whatever the " +
    "app accepts.",
};

/** `nested` — include raindrops from sub-collections. */
export const nestedParam: Param = {
  key: "nested",
  label: "Include nested collections",
  type: "boolean",
  hint: "Also match bookmarks inside sub-collections of the chosen collection.",
};

/** The raindrop id every single-item raindrop path takes. */
export const raindropIdParam: Param = {
  key: "raindropId",
  label: "Raindrop ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The `_id` of a bookmark, from a Search Raindrops or Create Raindrop result.",
};

/** The collection id every single-item collection path takes. */
export const collectionPathIdParam: Param = {
  key: "id",
  label: "Collection ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The `_id` of a collection, from List Collections.",
};

/**
 * The writable raindrop fields, shared by create and update.
 *
 * `pleaseParse` is modelled as a boolean rather than exposed as the vendor's
 * literal `{}`: the reference says "Specify empty object to automatically parse
 * meta data", so the wire value is a presence flag with no content, and asking a
 * user to type `{}` into a JSON box to mean "yes" would be a transcription of
 * the protocol rather than of the feature.
 */
export function raindropBodyParams(linkRequired: boolean): Param[] {
  return [
    {
      key: "link",
      label: "URL",
      type: "string",
      required: linkRequired,
      placeholder: "https://example.com/article",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      validation: { maxLength: 1000 },
      hint: "Max 1000 characters. Leave empty and turn on Parse metadata to let Raindrop fill it.",
    },
    {
      key: "excerpt",
      label: "Description",
      type: "text",
      validation: { maxLength: 10000 },
      hint: "The `excerpt` field. Max 10000 characters.",
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      validation: { maxLength: 10000 },
      hint: "Your own note on the bookmark. Max 10000 characters.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "collectionId",
      label: "Collection",
      type: "number",
      validation: { integer: true },
      hint: "Where to file it: a collection ID, or -1 for Unsorted. Sent as `collection.$id`.",
    },
    {
      key: "important",
      label: "Favorite",
      type: "boolean",
      hint: 'Marks the bookmark as "favorite".',
    },
    {
      key: "pleaseParse",
      label: "Parse metadata",
      type: "boolean",
      hint: "Ask Raindrop to fetch the page in the background and fill in cover, description and " +
        "type. The response returns before that finishes, so those fields arrive later.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: raindropTypeOptions,
      advanced: true,
      hint: "Normally detected by Raindrop. Set it only to override.",
    },
    {
      key: "cover",
      label: "Cover URL",
      type: "string",
      advanced: true,
      hint: "Must be one of the URLs already in the bookmark's `media` list, or `<screenshot>`.",
    },
    {
      key: "order",
      label: "Order",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Manual sort position, ascending. 0 puts the bookmark first.",
    },
  ];
}

/**
 * `reminder` is deliberately absent from {@link raindropBodyParams}.
 *
 * The reference lists the sub-field as **`reminder.data`** in the Raindrops
 * field table ("`reminder.data` | `Date` | YYYY-MM-DDTHH:mm:ss.sssZ"), which
 * reads like a typo for `date` — and there is no second place in the reference,
 * and no sample response, to settle it. Sending the wrong key would be accepted
 * silently as an unknown field and the reminder would simply never fire, so the
 * field is left out rather than guessed at. Everything else on the create/update
 * body is confirmed by both the field table and a sample payload.
 */
export const OMITTED_BODY_FIELDS = ["reminder"] as const;

/** The shape {@link raindropBodyParams} collects. */
export interface RaindropBodyInput {
  link?: string;
  title?: string;
  excerpt?: string;
  note?: string;
  tags?: string | string[];
  collectionId?: number;
  important?: boolean;
  pleaseParse?: boolean;
  type?: string;
  cover?: string;
  order?: number;
}

/**
 * Turn {@link RaindropBodyInput} into the request body Raindrop expects.
 *
 * Two shape translations happen here and nowhere else:
 *
 *  - **`collectionId` becomes `collection: {"$id": n}`.** The API's own field
 *    name is `collection.$id`; a flat `collectionId` in the form is far easier
 *    to fill, and a `$`-prefixed key in a user-facing form invites a JSONPath
 *    reading it does not have.
 *  - **`pleaseParse: true` becomes `pleaseParse: {}`.** The vendor's flag is
 *    presence-of-an-empty-object; `false` is expressed as absence, because
 *    `pleaseParse: false` is not documented and would rely on the API reading a
 *    boolean where it looks for an object.
 */
export function buildRaindropBody(
  input: RaindropBodyInput,
  tags: string[] | undefined,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.link !== undefined && input.link !== "") body.link = input.link;
  if (input.title !== undefined && input.title !== "") body.title = input.title;
  if (input.excerpt !== undefined && input.excerpt !== "") body.excerpt = input.excerpt;
  if (input.note !== undefined && input.note !== "") body.note = input.note;
  if (input.type !== undefined && input.type !== "") body.type = input.type;
  if (input.cover !== undefined && input.cover !== "") body.cover = input.cover;
  if (typeof input.important === "boolean") body.important = input.important;
  if (typeof input.order === "number") body.order = input.order;
  if (tags) body.tags = tags;
  if (typeof input.collectionId === "number" && Number.isFinite(input.collectionId)) {
    body.collection = { $id: input.collectionId };
  }
  if (input.pleaseParse === true) body.pleaseParse = {};
  return body;
}
