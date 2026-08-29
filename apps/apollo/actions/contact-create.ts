import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { typedCustomFieldsParam } from "../lib/params.ts";

/**
 * `POST /contacts` — save a new person (a "contact") to your team's Apollo instance.
 *
 * A contact is distinct from a `person` returned by `people-search`/`people-enrich`:
 * only contacts (people your team has explicitly saved) can be added to sequences or
 * tasks. Set `run_dedupe` to match against your existing contacts by email instead of
 * always creating a new one — unlike `account-create`, Apollo does offer this here.
 */
interface Input {
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  title?: string;
  account_id?: string;
  email?: string;
  website_url?: string;
  label_names?: string[] | string;
  contact_stage_id?: string;
  present_raw_address?: string;
  direct_phone?: string;
  mobile_phone?: string;
  run_dedupe?: boolean;
  typed_custom_fields?: unknown;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Save a new person to your Apollo instance.",
  idempotent: false,
  params: [
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "organization_name", label: "Employer name", type: "string" },
    {
      key: "account_id",
      label: "Account",
      type: "string",
      hint: "The Apollo account (company) this contact belongs to. From `account-create`/" +
        "`account-search`.",
    },
    { key: "website_url", label: "Employer website", type: "string" },
    {
      key: "label_names",
      label: "Lists",
      type: "string",
      hint: "Comma-separated list names this contact belongs to. Created if they don't exist.",
    },
    {
      key: "contact_stage_id",
      label: "Contact stage",
      type: "string",
      hint: "From `contact-stage-list`.",
    },
    { key: "present_raw_address", label: "Location", type: "string", hint: "e.g. `Atlanta, US`." },
    { key: "direct_phone", label: "Direct phone", type: "string" },
    { key: "mobile_phone", label: "Mobile phone", type: "string" },
    {
      key: "run_dedupe",
      label: "Match existing contact instead of duplicating",
      type: "boolean",
      hint: "Matches against your team's existing contacts (by email) instead of always creating " +
        "a new one.",
    },
    typedCustomFieldsParam,
  ],
  output: [{ key: "contact", type: "object", label: "The created (or matched) contact" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ contact?: unknown }>("/contacts", {
      body: compact({
        first_name: input.first_name,
        last_name: input.last_name,
        organization_name: input.organization_name,
        title: input.title,
        account_id: input.account_id,
        email: input.email,
        website_url: input.website_url,
        label_names: toArr(input.label_names),
        contact_stage_id: input.contact_stage_id,
        present_raw_address: input.present_raw_address,
        direct_phone: input.direct_phone,
        mobile_phone: input.mobile_phone,
        run_dedupe: input.run_dedupe,
        typed_custom_fields: input.typed_custom_fields,
      }),
    });
    return { contact: body.contact ?? null };
  },
};

export default contactCreate;
