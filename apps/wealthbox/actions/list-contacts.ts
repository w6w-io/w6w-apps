import type { ActionDefinition } from "@w6w/types";
import { PAGE_PARAMS, type PageInput, pageQuery, WealthboxClient } from "../lib/client.ts";

interface Input extends PageInput {
  id?: number;
  contactType?: string;
  name?: string;
  email?: string;
  phone?: string;
  active?: boolean;
  tags?: string[];
  deleted?: boolean;
  deletedSince?: string;
  householdTitle?: string;
  type?: string;
  order?: string;
  updatedSince?: string;
  updatedBefore?: string;
  externalUniqueId?: string;
}

/**
 * `GET /v1/contacts` — list/filter Contacts.
 *
 * Every filter below is one dev.wealthbox.com documents for this endpoint;
 * they combine (all are ANDed). `tags` accepts several values — sent as
 * repeated `tags[]=` query params, the Rails convention Wealthbox's API uses.
 */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List/filter Contacts (people, households, organizations, or trusts).",
  params: [
    { key: "id", label: "Contact ID", type: "number" },
    {
      key: "type",
      label: "Contact type",
      type: "select",
      options: [
        { value: "person", label: "Person" },
        { value: "household", label: "Household" },
        { value: "organization", label: "Organization" },
        { value: "trust", label: "Trust" },
      ],
    },
    { key: "contactType", label: "Classification", type: "string", hint: "e.g. Client, Prospect." },
    { key: "name", label: "Name", type: "string", hint: "Partial match across name fields." },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "active", label: "Active only", type: "boolean" },
    { key: "tags", label: "Tags", type: "array", item: { type: "string" } },
    { key: "deleted", label: "Deleted only", type: "boolean" },
    { key: "deletedSince", label: "Deleted since", type: "string" },
    { key: "householdTitle", label: "Household title", type: "string" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
        { value: "recent", label: "Recent" },
        { value: "created", label: "Created" },
        { value: "updated", label: "Updated" },
      ],
    },
    { key: "updatedSince", label: "Updated since", type: "string" },
    { key: "updatedBefore", label: "Updated before", type: "string" },
    { key: "externalUniqueId", label: "External unique ID", type: "string" },
    ...PAGE_PARAMS,
  ],
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    return new WealthboxClient(ctx).request("/contacts", {
      query: {
        id: input.id,
        contact_type: input.contactType,
        name: input.name,
        email: input.email,
        phone: input.phone,
        active: input.active,
        tags: input.tags,
        deleted: input.deleted,
        deleted_since: input.deletedSince,
        household_title: input.householdTitle,
        type: input.type,
        order: input.order,
        updated_since: input.updatedSince,
        updated_before: input.updatedBefore,
        external_unique_id: input.externalUniqueId,
        ...pageQuery(input),
      },
    });
  },
};

export default listContacts;
