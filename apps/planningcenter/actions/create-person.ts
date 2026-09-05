import type { ActionDefinition } from "@w6w/types";
import { type JsonApiSingle, PlanningCenterClient } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName?: string;
  birthdate?: string;
  gender?: string;
}

interface PersonAttributes {
  first_name?: string;
  last_name?: string;
  name?: string;
}

interface Output {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

/**
 * `POST /people/v2/people`, body wrapped in the JSON-API `{ "data": { "type":
 * "Person", "attributes": {...} } }` envelope the JSON-API guide documents for
 * every write.
 *
 * The vendor's own `person_attributes_assignable_on_create` schema marks NO
 * attribute as `required` — even `first_name` is technically optional — but a
 * nameless Person record is not useful, so this action requires `firstName`
 * itself rather than silently creating a blank profile.
 *
 * An email address is deliberately not a param here: `Email` is its own
 * JSON-API resource, added either via the create request's `included` array
 * or a separate `POST /people/v2/people/{id}/emails` call — a second concern
 * this action does not take on. See the README.
 */
const createPerson: ActionDefinition<Input, Output> = {
  key: "create-person",
  type: "perform",
  title: "Create Person",
  description: "Create a new person profile in the People directory.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "birthdate",
      label: "Birthdate",
      type: "date",
      hint: "ISO 8601 date, e.g. 1990-04-28.",
    },
    { key: "gender", label: "Gender", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "name", type: "string", label: "Full name" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating person", { firstName: input.firstName });
    const client = new PlanningCenterClient(ctx);
    const body = await client.post<JsonApiSingle<PersonAttributes>>("people", "/people", {
      body: {
        data: {
          type: "Person",
          attributes: {
            first_name: input.firstName,
            last_name: input.lastName,
            birthdate: input.birthdate,
            gender: input.gender,
          },
        },
      },
    });

    return {
      id: body.data.id,
      firstName: body.data.attributes.first_name,
      lastName: body.data.attributes.last_name,
      name: body.data.attributes.name,
    };
  },
};

export default createPerson;
