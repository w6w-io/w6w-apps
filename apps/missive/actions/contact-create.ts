import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient } from "../lib/client.ts";

interface Info {
  kind: string;
  value?: string;
  name?: string;
  label?: string;
  custom_label?: string;
  street?: string;
  extended_address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  po_box?: string;
  country?: string;
}

interface Membership {
  department?: string;
  title?: string;
  location?: string;
  description?: string;
  group: { kind: "organization" | "group"; name: string };
}

interface Input {
  contactBook: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  nickname?: string;
  fileAs?: string;
  notes?: string;
  starred?: boolean;
  gender?: string;
  infos?: Info[] | string;
  memberships?: Membership[] | string;
}

/**
 * `POST /v1/contacts` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Contacts, 2026-08-29.
 *
 * Creates one contact per call. Missive's own request body is an array (it
 * documents batch creation), but this action sends a single-element array and
 * returns that one created contact, since a workflow step naturally operates
 * on one record at a time.
 *
 * `infos` (email/phone/twitter/facebook/physical_address/url/custom entries)
 * and `memberships` (organization/group links) are structurally varied per
 * `kind` — accepted as JSON here rather than flattened into a fixed set of
 * fields, matching the vendor's own request shape.
 */
const action: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact in a contact book.",
  idempotent: false,
  params: [
    {
      key: "contactBook",
      label: "Contact Book ID",
      type: "string",
      required: true,
      hint: "Find IDs under Settings > API > Resource IDs.",
    },
    { key: "firstName", label: "First Name", type: "string", default: "" },
    { key: "lastName", label: "Last Name", type: "string", default: "" },
    { key: "middleName", label: "Middle Name", type: "string", default: "", advanced: true },
    { key: "nickname", label: "Nickname", type: "string", default: "", advanced: true },
    { key: "fileAs", label: "File As", type: "string", default: "", advanced: true },
    { key: "notes", label: "Notes", type: "text", default: "", advanced: true },
    { key: "starred", label: "Starred", type: "boolean", default: false, advanced: true },
    { key: "gender", label: "Gender", type: "string", default: "", advanced: true },
    {
      key: "infos",
      label: "Contact Infos (JSON array)",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. [{"kind":"email","label":"work","value":"phil@acme.com"}]. Kinds: email, ' +
        "phone_number, twitter, facebook, physical_address, url, custom.",
    },
    {
      key: "memberships",
      label: "Memberships (JSON array)",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. [{"title":"CEO","group":{"kind":"organization","name":"Acme"}}].',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First Name" },
    { key: "last_name", type: "string", label: "Last Name" },
    { key: "contact_book", type: "string", label: "Contact Book ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "modified_at", type: "number", label: "Modified At (Unix timestamp)" },
    { key: "infos", type: "array", label: "Contact Infos" },
    { key: "memberships", type: "array", label: "Memberships" },
  ],

  async execute(input, ctx) {
    if (!input.contactBook) throw new Error("`contactBook` is required");

    const contact = compact({
      contact_book: input.contactBook,
      first_name: input.firstName,
      last_name: input.lastName,
      middle_name: input.middleName,
      nickname: input.nickname,
      file_as: input.fileAs,
      notes: input.notes,
      starred: input.starred,
      gender: input.gender,
      infos: asOptionalJson<Info[]>(input.infos, "infos"),
      memberships: asOptionalJson<Membership[]>(input.memberships, "memberships"),
    });

    ctx.log("info", "creating Missive contact", { contactBook: input.contactBook });
    const res = await new MissiveClient(ctx).json<{ contacts: unknown[] }>("/contacts", {
      method: "POST",
      body: { contacts: [contact] },
    });
    return res.contacts[0];
  },
};

export default action;
