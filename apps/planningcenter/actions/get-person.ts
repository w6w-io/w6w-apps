import type { ActionDefinition } from "@w6w/types";
import { type JsonApiResource, type JsonApiSingle, PlanningCenterClient } from "../lib/client.ts";

interface Input {
  personId: string;
}

interface PersonAttributes {
  first_name?: string;
  last_name?: string;
  name?: string;
  status?: string;
  birthdate?: string;
  gender?: string;
  created_at?: string;
  updated_at?: string;
}

interface EmailAttributes {
  address?: string;
  primary?: boolean;
  blocked?: boolean;
}

interface Output {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  status?: string;
  birthdate?: string;
  gender?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * `GET /people/v2/people/{id}?include=emails`.
 *
 * The `Person.primary_email_address` attribute is documented as "Only
 * available when requested with the `?fields` param", but is not itself one
 * of the values the vendor's own OpenAPI document lists as legal for
 * `fields[Person]` — see `lib/client.ts`'s class doc for why this app does not
 * gamble on it. `?include=emails` is fully documented in the JSON-API guide
 * and returns `Email` resources (with their own `primary` boolean) in
 * `included`, which is where this action reads the email from instead —
 * preferring the one flagged `primary: true`, falling back to the first email
 * on record when none is flagged.
 */
const getPerson: ActionDefinition<Input, Output> = {
  key: "get-person",
  type: "read",
  title: "Get Person",
  description: "Read one person's profile, including their primary email address.",
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "name", type: "string", label: "Full name" },
    { key: "status", type: "string", label: "Status" },
    { key: "email", type: "string", label: "Primary email" },
  ],

  async execute(input, ctx) {
    const client = new PlanningCenterClient(ctx);
    const body = await client.get<JsonApiSingle<PersonAttributes>>(
      "people",
      `/people/${encodeURIComponent(input.personId)}`,
      { query: { include: "emails" } },
    );

    const emails = (body.included ?? []).filter((r) => r.type === "Email") as unknown as Array<
      JsonApiResource<EmailAttributes>
    >;
    const email: string | undefined =
      emails.find((e) => e.attributes.primary)?.attributes.address ??
        emails[0]?.attributes.address;

    const a = body.data.attributes;
    return {
      id: body.data.id,
      firstName: a.first_name,
      lastName: a.last_name,
      name: a.name,
      status: a.status,
      birthdate: a.birthdate,
      gender: a.gender,
      email,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    };
  },
};

export default getPerson;
