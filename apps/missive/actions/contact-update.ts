import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  nickname?: string;
  fileAs?: string;
  notes?: string;
  starred?: boolean;
  gender?: string;
  infos?: unknown[] | string;
  memberships?: unknown[] | string;
}

/**
 * `PATCH /v1/contacts/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Contacts, 2026-08-29.
 *
 * Only the fields set on this action are sent, so unset fields keep their
 * current value — except `infos` and `memberships`, which the vendor
 * documents as replace-whole-array: passing either drops any item you did not
 * include. Leave both blank to change neither.
 */
const action: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact. Only the fields you set are changed — EXCEPT Contact Infos and " +
    "Memberships, which replace the entire array when set: omit an item you want to keep and " +
    "it is deleted from the contact.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
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
      label: "Contact Infos (JSON array — replaces all)",
      type: "json",
      default: "",
      advanced: true,
    },
    {
      key: "memberships",
      label: "Memberships (JSON array — replaces all)",
      type: "json",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First Name" },
    { key: "last_name", type: "string", label: "Last Name" },
    { key: "modified_at", type: "number", label: "Modified At (Unix timestamp)" },
    { key: "infos", type: "array", label: "Contact Infos" },
    { key: "memberships", type: "array", label: "Memberships" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");

    const contact = compact({
      id: input.id,
      first_name: input.firstName,
      last_name: input.lastName,
      middle_name: input.middleName,
      nickname: input.nickname,
      file_as: input.fileAs,
      notes: input.notes,
      starred: input.starred,
      gender: input.gender,
      infos: asOptionalJson<unknown[]>(input.infos, "infos"),
      memberships: asOptionalJson<unknown[]>(input.memberships, "memberships"),
    });

    ctx.log("info", "updating Missive contact", { id: input.id });
    const res = await new MissiveClient(ctx).json<{ contacts: unknown[] }>(
      `/contacts/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body: { contacts: [contact] } },
    );
    return res.contacts[0];
  },
};

export default action;
