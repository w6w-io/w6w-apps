import type { Param } from "@w6w/types";

/** Shared `documentId` path param — every Document action needs it. */
export const documentIdParam: Param = {
  key: "documentId",
  label: "Document ID",
  type: "string",
  required: true,
  hint:
    "The 40-character document id (from Get Document, List Folder, or a previous action's output).",
};

/**
 * The document summary fields this app surfaces from a document object. Not
 * exhaustive — SignNow's document resource is large and mostly internal
 * editor state (field placements, signature images, routing details); these
 * are the fields a workflow typically needs.
 */
export const documentSummaryOutput = [
  { key: "id", type: "string" as const, label: "Document ID" },
  { key: "document_name", type: "string" as const, label: "Document name" },
  { key: "page_count", type: "string" as const, label: "Page count" },
  { key: "created", type: "string" as const, label: "Created (Unix timestamp)" },
  { key: "updated", type: "string" as const, label: "Last updated (Unix timestamp)" },
  { key: "owner", type: "string" as const, label: "Owner email" },
  { key: "template", type: "boolean" as const, label: "Is this document a template" },
  { key: "original_filename", type: "string" as const, label: "Original filename" },
];
