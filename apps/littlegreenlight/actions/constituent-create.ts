import type { ActionDefinition } from "@w6w/types";
import { compact, LglClient } from "../lib/client.ts";

interface Input {
  first_name: string;
  last_name: string;
  is_org?: boolean;
  org_name?: string;
  external_constituent_id?: string;
  email?: string;
}

/**
 * `POST /api/v1/constituents.json`.
 *
 * LGL's own `CreateBody` schema marks `first_name`, `last_name` AND
 * `email_addresses` all required — an unusual combination, since it means
 * even an organization-only record (`is_org: true` + `org_name`) is
 * documented as needing a first/last name too. This action follows the
 * schema literally rather than second-guessing it: `first_name`/`last_name`
 * are required inputs, and `email` builds a single-element `email_addresses`
 * array when given, an empty array otherwise (satisfying the documented
 * array-required field without forcing an email on every constituent).
 */
const constituentCreate: ActionDefinition<Input> = {
  key: "constituent-create",
  type: "perform",
  resource: "constituent",
  title: "Create Constituent",
  description: "Create a new constituent record.",
  idempotent: false,
  params: [
    { key: "first_name", label: "First name", type: "string", required: true },
    { key: "last_name", label: "Last name", type: "string", required: true },
    {
      key: "is_org",
      label: "Is organization",
      type: "boolean",
      default: false,
      hint: "This constituent is an organization or company.",
    },
    { key: "org_name", label: "Organization name", type: "string" },
    {
      key: "email",
      label: "Email address",
      type: "string",
      hint: "LGL's schema marks email_addresses as required; sent as a single-item list, or " +
        "an empty list when left blank.",
    },
    { key: "external_constituent_id", label: "External constituent ID", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Constituent ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  async execute(input, ctx) {
    const body = {
      first_name: input.first_name,
      last_name: input.last_name,
      email_addresses: input.email ? [{ address: input.email }] : [],
      ...compact({
        is_org: input.is_org,
        org_name: input.org_name,
        external_constituent_id: input.external_constituent_id,
      }),
    };
    return await new LglClient(ctx).create("/constituents", body);
  },
};

export default constituentCreate;
