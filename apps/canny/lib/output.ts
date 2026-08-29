import type { OutputField } from "@w6w/types";

/**
 * Shared `output` field lists — one per Canny object, matching the
 * "Attributes" table Canny documents for each (`developers.canny.io/api-reference`,
 * verified 2026-08-29). These describe the *top-level* shape for the editor's
 * output preview; nested objects (e.g. a post's `author`) are declared
 * `type: "object"` rather than expanded, since Canny nests a different object
 * shape (Board, User, Category, ...) at each of those keys depending on the
 * endpoint.
 */

export const boardOutput: OutputField[] = [
  { key: "id", type: "string", label: "Board ID" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "isPrivate", type: "boolean", label: "Private board" },
  { key: "name", type: "string", label: "Name" },
  { key: "postCount", type: "number", label: "Post count" },
  { key: "privateComments", type: "boolean", label: "Comments hidden from other end-users" },
  { key: "url", type: "string", label: "Board URL" },
];

export const categoryOutput: OutputField[] = [
  { key: "id", type: "string", label: "Category ID" },
  { key: "board", type: "object", label: "Board" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "name", type: "string", label: "Name" },
  { key: "parentID", type: "string", label: "Parent category ID, if a subcategory" },
  { key: "postCount", type: "number", label: "Post count" },
  { key: "url", type: "string", label: "Category URL" },
];

export const tagOutput: OutputField[] = [
  { key: "id", type: "string", label: "Tag ID" },
  { key: "board", type: "object", label: "Board" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "name", type: "string", label: "Name" },
  { key: "postCount", type: "number", label: "Post count" },
  { key: "url", type: "string", label: "Tag URL" },
];

export const userOutput: OutputField[] = [
  { key: "id", type: "string", label: "User ID (Canny)" },
  { key: "alias", type: "string", label: "Alias (shown on anonymized boards)" },
  { key: "avatarURL", type: "string", label: "Avatar URL" },
  { key: "companies", type: "array", label: "Companies this user belongs to" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "customFields", type: "object", label: "Custom fields" },
  { key: "email", type: "string", label: "Email" },
  { key: "isAdmin", type: "boolean", label: "Canny admin" },
  { key: "lastActivity", type: "string", label: "Last activity (ISO 8601)" },
  { key: "name", type: "string", label: "Name" },
  { key: "url", type: "string", label: "Profile URL" },
  { key: "userID", type: "string", label: "User ID (your application's)" },
];

export const companyOutput: OutputField[] = [
  { key: "id", type: "string", label: "Company ID" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "customFields", type: "object", label: "Custom fields" },
  { key: "domain", type: "string", label: "Domain" },
  { key: "memberCount", type: "number", label: "Member count" },
  { key: "monthlySpend", type: "number", label: "Monthly spend (MRR)" },
  { key: "name", type: "string", label: "Name" },
];

/**
 * The post object has ~25 documented top-level fields (author, board, by,
 * category, comments, custom fields, eta, images, jira/clickup/linear links,
 * owner, roadmaps, score, status, tags, title, details, ...). Only the fields
 * an action's own params can filter or that a workflow step commonly reads
 * are listed here; the rest still come back on the wire, just undeclared.
 */
export const postOutput: OutputField[] = [
  { key: "id", type: "string", label: "Post ID" },
  { key: "author", type: "object", label: "Author (User)" },
  { key: "board", type: "object", label: "Board" },
  { key: "category", type: "object", label: "Category, if assigned" },
  { key: "commentCount", type: "number", label: "Comment count" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "customFields", type: "array", label: "Custom fields" },
  { key: "details", type: "string", label: "Details" },
  { key: "eta", type: "string", label: "ETA (MM/YYYY)" },
  { key: "imageURLs", type: "array", label: "Image URLs" },
  { key: "owner", type: "object", label: "Owner (User)" },
  { key: "score", type: "number", label: "Vote score" },
  { key: "status", type: "string", label: "Status" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "title", type: "string", label: "Title" },
  { key: "url", type: "string", label: "Post URL" },
];

export const voteOutput: OutputField[] = [
  { key: "id", type: "string", label: "Vote ID" },
  { key: "board", type: "object", label: "Board" },
  { key: "by", type: "object", label: "Admin who cast the vote, if any" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "post", type: "object", label: "Post" },
  { key: "voter", type: "object", label: "Voter (User)" },
  { key: "votePriority", type: "string", label: "Vote priority" },
];

export const commentOutput: OutputField[] = [
  { key: "id", type: "string", label: "Comment ID" },
  { key: "author", type: "object", label: "Author (User)" },
  { key: "board", type: "object", label: "Board" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "imageURLs", type: "array", label: "Image URLs" },
  { key: "internal", type: "boolean", label: "Internal-only comment" },
  { key: "likeCount", type: "number", label: "Like count" },
  { key: "parentID", type: "string", label: "Parent comment ID, if a reply" },
  { key: "post", type: "object", label: "Post" },
  { key: "private", type: "boolean", label: "Private" },
  { key: "value", type: "string", label: "Comment text" },
];

export const statusChangeOutput: OutputField[] = [
  { key: "id", type: "string", label: "Status change ID" },
  { key: "changeComment", type: "object", label: "Attached comment, if any" },
  { key: "changer", type: "object", label: "Admin who changed the status" },
  { key: "created", type: "string", label: "Created (ISO 8601)" },
  { key: "post", type: "object", label: "Post" },
  { key: "status", type: "string", label: "New status" },
];

export const entryOutput: OutputField[] = [
  { key: "id", type: "string", label: "Entry ID" },
];

export const idOutput: OutputField[] = [
  { key: "id", type: "string", label: "ID" },
];

export const messageOutput: OutputField[] = [
  { key: "message", type: "string", label: "Result" },
];
