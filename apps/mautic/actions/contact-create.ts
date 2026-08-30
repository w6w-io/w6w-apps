import type { ActionDefinition } from "@w6w/types";
import { compact, csv, MauticClient } from "../lib/client.ts";

/**
 * `POST /contacts/new` — verified against Mautic's REST API docs
 * (`contacts.html`, "Create Contact"). Mautic accepts any Contact field alias
 * as a POST parameter; the common core fields are exposed directly and
 * `otherFields` covers any custom field alias without this app having to know
 * every alias an instance defines.
 */
const action: ActionDefinition = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create a contact",
  description: "Create a new contact.",
  // Two calls with the same email create two contacts — Mautic does not dedupe on create.
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", default: "" },
    { key: "firstname", label: "First Name", type: "string", default: "" },
    { key: "lastname", label: "Last Name", type: "string", default: "" },
    { key: "phone", label: "Phone", type: "string", default: "" },
    { key: "company", label: "Company (free text)", type: "string", default: "" },
    {
      key: "ipAddress",
      label: "IP Address",
      type: "string",
      default: "",
      hint: "IP address to associate with the contact.",
    },
    {
      key: "ownerId",
      label: "Owner User ID",
      type: "number",
      default: 0,
      hint: "ID of a Mautic User to assign this contact to. 0 means unset.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated tag names to apply.",
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
    { key: "points", type: "number", label: "Lead score" },
    { key: "fields", type: "object", label: "Field values, grouped" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
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

    const body = compact({
      email: p.email,
      firstname: p.firstname,
      lastname: p.lastname,
      phone: p.phone,
      company: p.company,
      ipAddress: p.ipAddress,
      owner: Number(p.ownerId ?? 0) > 0 ? Number(p.ownerId) : undefined,
      tags: csv(p.tags),
      overwriteWithBlank: p.overwriteWithBlank === true ? true : undefined,
      ...other,
    });

    ctx.log("info", "creating a Mautic contact", { email: p.email });

    const res = await new MauticClient(ctx).request<{ contact: unknown }>("/contacts/new", {
      method: "POST",
      body,
    });
    return res.contact;
  },
};

export default action;
