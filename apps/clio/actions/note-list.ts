import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import {
  fieldsParam,
  matterIdFilterParam,
  noteTypeOptions,
  paginationParams,
  queryParam,
  refParam,
} from "../lib/params.ts";

/** `GET /notes.json` */
interface Input {
  matterId?: number;
  contactId?: number;
  type?: string;
  query?: string;
  fields?: string;
  limit?: number;
  pageToken?: string;
}

const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "search",
  resource: "note",
  title: "List Notes",
  description: "List notes attached to matters or contacts.",
  params: [
    matterIdFilterParam,
    refParam("contactId", "Contact ID"),
    { key: "type", label: "Type", type: "select", options: noteTypeOptions },
    { ...queryParam, hint: "Wildcard search across subject and detail." },
    fieldsParam("id,etag,subject,date,detail,type,matter{id,display_number},contact{id,name}"),
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Notes" },
    { key: "nextPageToken", type: "string", label: "Token for the next page, if any" },
  ],

  execute(input, ctx) {
    return new ClioClient(ctx).list("/notes.json", {
      query: {
        matter_id: input.matterId,
        contact_id: input.contactId,
        type: input.type,
        query: input.query,
        fields: input.fields,
        limit: input.limit,
        order: "id(asc)",
        page_token: input.pageToken,
      },
    });
  },
};

export default noteList;
