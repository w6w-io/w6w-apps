import type { Param } from "@w6w/types";
import { compact, unset } from "./client.ts";

/**
 * Fields shared by `party-create` and `party-update`.
 *
 * Deliberately NOT covered: the `addresses`/`phoneNumbers`/`websites`/
 * `emailAddresses`/`tags`/`fields` array-editing semantics Capsule's
 * `updateParty` docs describe (add an entry with no `id`, patch one by
 * `id`, delete one with `"_delete": true`). Modelling that generically as
 * Action params would need a nested repeating-object param per collection;
 * this app instead exposes a single email/phone as a convenience for the
 * common "create a contact from a lead form" case. Managing the full
 * collections is left out — see README.
 */
export interface PartyFieldsInput {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  personTitle?: string;
  name?: string;
  about?: string;
  organisationId?: number;
  organisationName?: string;
  ownerId?: number;
  teamId?: number;
  email?: string;
  phone?: string;
}

export const partyFieldParams: Param[] = [
  { key: "firstName", label: "First name", type: "string", row: "person-name" },
  { key: "lastName", label: "Last name", type: "string", row: "person-name" },
  { key: "personTitle", label: "Title (Mr, Dr, ...)", type: "string", advanced: true },
  { key: "jobTitle", label: "Job title", type: "string" },
  { key: "name", label: "Organisation name", type: "string" },
  { key: "about", label: "About", type: "text", advanced: true },
  {
    key: "organisationId",
    label: "Link to organisation (ID)",
    type: "number",
    row: "org",
    hint: "Attaches a person to an existing organisation.",
  },
  {
    key: "organisationName",
    label: "Link to organisation (name)",
    type: "string",
    row: "org",
    hint: "Used only when Link to organisation (ID) is blank. Creates the organisation if no " +
      "match exists.",
  },
  { key: "email", label: "Email", type: "string", row: "contact" },
  { key: "phone", label: "Phone", type: "string", row: "contact" },
  { key: "ownerId", label: "Owner user ID", type: "number", advanced: true },
  { key: "teamId", label: "Team ID", type: "number", advanced: true },
];

/** Builds the `party` request body object, dropping unset fields for a PUT-safe partial update. */
export function buildPartyBody(
  input: PartyFieldsInput & { type?: "person" | "organisation" },
): Record<string, unknown> {
  const body: Record<string, unknown> = compact({
    type: input.type,
    firstName: unset(input.firstName),
    lastName: unset(input.lastName),
    title: unset(input.personTitle),
    jobTitle: unset(input.jobTitle),
    name: unset(input.name),
    about: unset(input.about),
    owner: input.ownerId !== undefined ? { id: input.ownerId } : undefined,
    team: input.teamId !== undefined ? { id: input.teamId } : undefined,
  });
  if (input.organisationId !== undefined) {
    body.organisation = { id: input.organisationId };
  } else if (unset(input.organisationName)) {
    body.organisation = { name: input.organisationName };
  }
  if (unset(input.email)) body.emailAddresses = [{ address: input.email }];
  if (unset(input.phone)) body.phoneNumbers = [{ number: input.phone }];
  return body;
}
