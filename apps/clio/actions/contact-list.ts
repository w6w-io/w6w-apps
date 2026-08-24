import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import {
  contactTypeOptions,
  createdSinceParam,
  fieldsParam,
  paginationParams,
  queryParam,
  updatedSinceParam,
} from "../lib/params.ts";

/** `GET /contacts.json` */
interface Input {
  type?: string;
  clientOnly?: boolean;
  query?: string;
  createdSince?: string;
  updatedSince?: string;
  fields?: string;
  limit?: number;
  pageToken?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts (people and companies), optionally filtered by type or client status.",
  params: [
    { key: "type", label: "Type", type: "select", options: contactTypeOptions },
    {
      key: "clientOnly",
      label: "Clients only",
      type: "boolean",
      hint: "Only contacts who are clients on at least one matter.",
    },
    { ...queryParam, hint: "Wildcard search across name, email, address and phone number." },
    createdSinceParam,
    updatedSinceParam,
    fieldsParam("id,etag,name,type,primary_email_address,primary_phone_number"),
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "nextPageToken", type: "string", label: "Token for the next page, if any" },
  ],

  execute(input, ctx) {
    return new ClioClient(ctx).list("/contacts.json", {
      query: {
        type: input.type,
        client_only: input.clientOnly,
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

export default contactList;
