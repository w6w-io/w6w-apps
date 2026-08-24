import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import {
  fieldsParam,
  matterIdFilterParam,
  paginationParams,
  queryParam,
  refParam,
} from "../lib/params.ts";

/** `GET /documents.json` */
interface Input {
  matterId?: number;
  contactId?: number;
  parentId?: number;
  query?: string;
  fields?: string;
  limit?: number;
  pageToken?: string;
}

const documentList: ActionDefinition<Input> = {
  key: "document-list",
  type: "search",
  resource: "document",
  title: "List Documents",
  description: "List documents, optionally filtered by matter, contact or parent folder.",
  params: [
    matterIdFilterParam,
    refParam("contactId", "Contact ID"),
    refParam("parentId", "Parent folder ID", "Leave empty to search across all folders."),
    { ...queryParam, hint: "Wildcard search across the document name." },
    fieldsParam("id,etag,name,content_type,created_at,updated_at,matter{id,display_number}"),
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Documents" },
    { key: "nextPageToken", type: "string", label: "Token for the next page, if any" },
  ],

  execute(input, ctx) {
    return new ClioClient(ctx).list("/documents.json", {
      query: {
        matter_id: input.matterId,
        contact_id: input.contactId,
        parent_id: input.parentId,
        query: input.query,
        fields: input.fields,
        limit: input.limit,
        order: "id(asc)",
        page_token: input.pageToken,
      },
    });
  },
};

export default documentList;
