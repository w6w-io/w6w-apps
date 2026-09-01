import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient, compact } from "../lib/client.ts";

interface Input {
  type: "Individual" | "Organization";
  status?: "Active" | "Inactive" | "Deceased";
  firstName?: string;
  lastName?: string;
  fullName?: string;
  primaryEmail?: string;
  primaryEmailType?: "Home" | "Work";
  primaryPhone?: string;
  primaryPhoneType?: "Home" | "Work" | "Mobile" | "Fax";
}

/**
 * `POST /constituent` — create a constituent (an Individual or Organization).
 *
 * Bloomerang's own request schema carries a validation note verbatim: "*
 * FirstName and LastName are required when Type is Individual. FullName is
 * required when Type is Organization.*" This action exposes both so either
 * shape can be built, but does not enforce the rule client-side — Bloomerang's
 * own validation is the source of truth and returns a clear error if it is
 * violated.
 *
 * `PrimaryEmail`/`PrimaryPhone` are confirmed embeddable fields on constituent
 * create (each a nested `{ Type, Value }` / `{ Type, Number }` object per the
 * schema) — a shortcut to the `/email` and `/phone` endpoints for the common
 * case of one address at creation time. Additional emails, phones and
 * addresses are out of scope for this action; use the dedicated `/email`,
 * `/phone` and `/address` endpoints for those.
 *
 * Not idempotent: Bloomerang mints a new constituent id per call with no
 * idempotency key on this endpoint, so a retry creates a duplicate record.
 */
const createConstituent: ActionDefinition<Input> = {
  key: "create-constituent",
  type: "perform",
  resource: "constituent",
  title: "Create Constituent",
  description:
    "Create an Individual or Organization constituent, optionally with a primary email and " +
    "phone number.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "Individual", label: "Individual" },
        { value: "Organization", label: "Organization" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Deceased", label: "Deceased" },
      ],
      hint: "Defaults to Bloomerang's own default (Active) when omitted.",
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      hint: "Required by Bloomerang when Type is Individual.",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
      hint: "Required by Bloomerang when Type is Individual.",
    },
    {
      key: "fullName",
      label: "Full / organization name",
      type: "string",
      hint: "Required by Bloomerang when Type is Organization.",
    },
    { key: "primaryEmail", label: "Primary email", type: "string" },
    {
      key: "primaryEmailType",
      label: "Primary email type",
      type: "select",
      default: "Home",
      options: [
        { value: "Home", label: "Home" },
        { value: "Work", label: "Work" },
      ],
    },
    { key: "primaryPhone", label: "Primary phone number", type: "string" },
    {
      key: "primaryPhoneType",
      label: "Primary phone type",
      type: "select",
      default: "Home",
      options: [
        { value: "Home", label: "Home" },
        { value: "Work", label: "Work" },
        { value: "Mobile", label: "Mobile" },
        { value: "Fax", label: "Fax" },
      ],
    },
  ],
  output: [{ key: "Id", type: "number", label: "Constituent ID" }],

  execute(input, ctx) {
    const body = compact({
      Type: input.type,
      Status: input.status,
      FirstName: input.firstName,
      LastName: input.lastName,
      FullName: input.fullName,
      PrimaryEmail: input.primaryEmail
        ? { Type: input.primaryEmailType ?? "Home", Value: input.primaryEmail }
        : undefined,
      PrimaryPhone: input.primaryPhone
        ? { Type: input.primaryPhoneType ?? "Home", Number: input.primaryPhone }
        : undefined,
    });
    return new BloomerangClient(ctx).request("/constituent", { method: "POST", body });
  },
};

export default createConstituent;
