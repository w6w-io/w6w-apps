import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient, compact } from "../lib/client.ts";

interface Input {
  id: number;
  type?: "Individual" | "Organization";
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
 * `PUT /constituent/{id}` — update a constituent. Bloomerang's request schema
 * for the update mirrors create (confirmed against the OpenAPI document: the
 * same `Type`/`Status`/`FirstName`/`LastName`/`FullName`/`PrimaryEmail`/
 * `PrimaryPhone` fields), so this action reuses that shape and, like the Close
 * app's convention, only sends fields the caller actually supplied — Bloomerang
 * treats an omitted key as "leave it alone", not "clear it".
 *
 * Idempotent: replaying the same call with the same field values converges on
 * the same result rather than compounding.
 */
const updateConstituent: ActionDefinition<Input> = {
  key: "update-constituent",
  type: "perform",
  resource: "constituent",
  title: "Update Constituent",
  description: "Update fields on an existing constituent by its API id.",
  idempotent: true,
  params: [
    { key: "id", label: "Constituent ID", type: "number", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
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
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "fullName", label: "Full / organization name", type: "string" },
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
    return new BloomerangClient(ctx).request(`/constituent/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateConstituent;
