import type { ActionDefinition } from "@w6w/types";
import { compact, MauticClient } from "../lib/client.ts";
import { CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `PATCH /contacts/{id}/edit` — verified against Mautic's REST API docs
 * (`contacts.html`, "Edit Contact"). Mautic also supports `PUT` on the same
 * path, which creates the contact if the ID does not exist and clears fields
 * the request omits; `PATCH` is used here deliberately, because an "edit"
 * action that silently creates a new contact — or silently blanks fields the
 * caller did not mean to touch — is a surprise this app should not deal.
 *
 * **Tag removal uses a `-` prefix.** Per the docs: `tags: ['one', '-two']`
 * adds `one` and removes `two` from the contact in the same call.
 */
const action: ActionDefinition = {
  key: "contact-edit",
  type: "perform",
  resource: "contact",
  title: "Edit a contact",
  description: "Update a contact's fields. Fails if the contact does not exist.",
  idempotent: true,
  params: [
    CONTACT_ID_PARAM,
    { key: "email", label: "Email", type: "string", default: "" },
    { key: "firstname", label: "First Name", type: "string", default: "" },
    { key: "lastname", label: "Last Name", type: "string", default: "" },
    { key: "phone", label: "Phone", type: "string", default: "" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated tag names. Prefix a tag with `-` to remove it, e.g. `vip,-cold`.",
    },
    {
      key: "overwriteWithBlank",
      label: "Overwrite With Blank",
      type: "boolean",
      default: false,
      hint: "If on, an empty value clears a field instead of being skipped.",
    },
    {
      key: "otherFields",
      label: "Other Fields (JSON)",
      type: "json",
      default: "",
      hint: 'Any other Contact field alias, e.g. {"city": "Austin", "custom_alias": "value"}.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "fields", type: "object", label: "Field values, grouped" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.contactId);
    if (!Number.isFinite(id)) throw new Error("`contactId` must be a number");

    let other: Record<string, unknown> = {};
    if (p.otherFields) {
      if (typeof p.otherFields === "string") {
        try {
          other = JSON.parse(p.otherFields);
        } catch {
          throw new Error("`otherFields` is not valid JSON");
        }
      } else if (typeof p.otherFields === "object") {
        other = p.otherFields as Record<string, unknown>;
      }
    }

    // `tags` can carry a leading `-` per entry, which `csv()`'s trim preserves.
    const tags = Array.isArray(p.tags)
      ? (p.tags as unknown[]).map((s) => String(s).trim()).filter(Boolean)
      : typeof p.tags === "string" && p.tags.trim()
      ? p.tags.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const body = compact({
      email: p.email,
      firstname: p.firstname,
      lastname: p.lastname,
      phone: p.phone,
      tags,
      overwriteWithBlank: p.overwriteWithBlank === true ? true : undefined,
      ...other,
    });

    ctx.log("info", "editing a Mautic contact", { id });

    const res = await new MauticClient(ctx).request<{ contact: unknown }>(
      `/contacts/${id}/edit`,
      { method: "PATCH", body },
    );
    return res.contact;
  },
};

export default action;
