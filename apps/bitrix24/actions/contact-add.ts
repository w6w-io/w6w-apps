import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client, compact, parseJson, toMultifield } from "../lib/client.ts";
import { EXTRA_FIELDS_PARAM } from "../lib/params.ts";

interface Input {
  name?: string;
  lastName?: string;
  secondName?: string;
  typeId?: string;
  sourceId?: string;
  sourceDescription?: string;
  post?: string;
  comments?: string;
  opened?: boolean;
  assignedById?: number;
  phone?: string;
  email?: string;
  extraFields?: string | Record<string, unknown>;
}

/**
 * `crm.contact.add` — verified against
 * `api-reference/crm/contacts/crm-contact-add.html`. DEPRECATED by the vendor
 * in favor of `crm.item.add` (see `README.md`). An incorrect field in
 * `fields` is ignored by Bitrix24 rather than rejected, per the vendor's own
 * docs.
 */
const action: ActionDefinition<Input, { id: number }> = {
  key: "contact-add",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new CRM contact.",
  idempotent: false,
  params: [
    { key: "name", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "secondName", label: "Middle Name", type: "string", advanced: true },
    {
      key: "typeId",
      label: "Contact Type",
      type: "string",
      hint: 'List available types with `crm.status.list`, filter { ENTITY_ID: "CONTACT_TYPE" }.',
    },
    { key: "sourceId", label: "Source", type: "string" },
    { key: "sourceDescription", label: "Source Description", type: "string", advanced: true },
    { key: "post", label: "Position", type: "string", advanced: true },
    { key: "comments", label: "Comments", type: "text", advanced: true },
    {
      key: "opened",
      label: "Available To Everyone",
      type: "boolean",
      default: true,
      advanced: true,
    },
    { key: "assignedById", label: "Assigned To (User ID)", type: "number", advanced: true },
    { key: "phone", label: "Phone", type: "string" },
    { key: "email", label: "Email", type: "string" },
    EXTRA_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Contact ID" }],

  async execute(input, ctx) {
    const extra = parseJson(input.extraFields, "extraFields") as
      | Record<string, unknown>
      | undefined;
    if (extra !== undefined && (typeof extra !== "object" || Array.isArray(extra))) {
      throw new Error("`extraFields` must be a JSON object");
    }

    const fields = {
      ...(extra ?? {}),
      ...compact({
        NAME: input.name,
        LAST_NAME: input.lastName,
        SECOND_NAME: input.secondName,
        TYPE_ID: input.typeId,
        SOURCE_ID: input.sourceId,
        SOURCE_DESCRIPTION: input.sourceDescription,
        POST: input.post,
        COMMENTS: input.comments,
        OPENED: input.opened === undefined ? undefined : (input.opened ? "Y" : "N"),
        ASSIGNED_BY_ID: input.assignedById,
        PHONE: toMultifield(input.phone),
        EMAIL: toMultifield(input.email),
      }),
    };

    ctx.log("info", "creating Bitrix24 contact", { lastName: input.lastName });
    const id = await new Bitrix24Client(ctx).call<number>("crm.contact.add", { fields });
    return { id };
  },
};

export default action;
