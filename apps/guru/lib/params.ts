import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Guru actions.
 *
 * Every enum here is copied verbatim from Guru's OpenAPI 3 document (fetched
 * 2026-09-05 from `dash.readme.com/api/v1/api-registry/3gy914ims4w0woi`), not
 * inferred.
 */

export const cardIdParam: Param = {
  key: "cardId",
  label: "Card ID",
  type: "string",
  required: true,
  placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  hint: "The Card's UUID, from a Search Cards result or the Card's own `id` field.",
};

export const collectionIdParam: Param = {
  key: "collectionId",
  label: "Collection ID",
  type: "string",
  required: true,
  placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  hint: "A Collection's UUID, from List Collections.",
};

export const folderIdParam: Param = {
  key: "folderId",
  label: "Folder ID",
  type: "string",
  required: true,
  placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  hint: "A Folder's UUID, from List Folders. Guru's own UI calls these \"Boards\".",
};

/** Paging cursor, pulled from a previous call's `nextToken` output. */
export const pageTokenParam: Param = {
  key: "token",
  label: "Page token",
  type: "string",
  advanced: true,
  hint: "From a previous call's `nextToken` output. Leave empty to fetch the first page.",
};

/** `NewCard`/`Card`'s `shareStatus` enum. */
export const shareStatusOptions = [
  { value: "TEAM", label: "Team — visible to the Collection's members" },
  { value: "PRIVATE", label: "Private — visible only to the Card's owner" },
  { value: "PUBLIC", label: "Public — anyone with the link" },
];

export const shareStatusParam: Param = {
  key: "shareStatus",
  label: "Share status",
  type: "select",
  options: shareStatusOptions,
  hint: 'Guru\'s own note: omitting this or setting it to "Private" makes a Card visible only to ' +
    'its owner. Set "Team" to make it visible to the Collection.',
};

/** `search/cardmgr`'s `queryType` enum. */
export const cardSearchQueryTypeOptions = [
  { value: "cards", label: "Cards (default)" },
  { value: "archived", label: "Archived cards" },
  { value: "draft", label: "Drafts" },
  { value: "legacy", label: "Legacy" },
  { value: "search_cards", label: "Search cards" },
];

/** The sort fields `search/cardmgr` documents. */
export const cardSortFieldOptions = [
  { value: "relevancy", label: "Relevancy" },
  { value: "lastModified", label: "Last modified" },
  { value: "dateCreated", label: "Date created" },
  { value: "title", label: "Title" },
  { value: "verificationState", label: "Verification state" },
  { value: "nextVerificationDate", label: "Next verification date" },
  { value: "popularity", label: "Popularity" },
  { value: "viewCount", label: "View count" },
  { value: "favoriteCount", label: "Favorite count" },
  { value: "collection", label: "Collection" },
];

export const sortOrderOptions = [
  { value: "ASC", label: "Ascending" },
  { value: "DESC", label: "Descending" },
];
