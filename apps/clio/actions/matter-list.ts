import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import {
  createdSinceParam,
  fieldsParam,
  matterStatusOptions,
  paginationParams,
  queryParam,
  refParam,
  updatedSinceParam,
} from "../lib/params.ts";

/** `GET /matters.json` — matters visible to this user. */
interface Input {
  status?: string;
  clientId?: number;
  practiceAreaId?: number;
  responsibleAttorneyId?: number;
  query?: string;
  createdSince?: string;
  updatedSince?: string;
  fields?: string;
  limit?: number;
  pageToken?: string;
}

const matterList: ActionDefinition<Input> = {
  key: "matter-list",
  type: "search",
  resource: "matter",
  title: "List Matters",
  description: "List matters, optionally filtered by status, client, practice area or attorney.",
  params: [
    { key: "status", label: "Status", type: "select", options: matterStatusOptions },
    refParam("clientId", "Client (contact) ID"),
    refParam("practiceAreaId", "Practice area ID"),
    refParam("responsibleAttorneyId", "Responsible attorney (user) ID"),
    { ...queryParam, hint: "Wildcard search across matter number, description and client name." },
    createdSinceParam,
    updatedSinceParam,
    fieldsParam("id,etag,display_number,description,status,client{id,name},open_date,close_date"),
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Matters" },
    { key: "nextPageToken", type: "string", label: "Token for the next page, if any" },
  ],

  execute(input, ctx) {
    return new ClioClient(ctx).list("/matters.json", {
      query: {
        status: input.status,
        client_id: input.clientId,
        practice_area_id: input.practiceAreaId,
        responsible_attorney_id: input.responsibleAttorneyId,
        query: input.query,
        created_since: input.createdSince,
        updated_since: input.updatedSince,
        fields: input.fields,
        limit: input.limit,
        order: "id(asc)",
        page_token: input.pageToken,
      },
    });
  },
};

export default matterList;
