import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `GET /persons/:id` — one person's profile. */
interface Input {
  id: number;
}

const personGet: ActionDefinition<Input> = {
  key: "person-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Fetch one person's profile by ID.",
  params: [{ key: "id", label: "Person ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "avatar", type: "string", label: "Avatar URL" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/persons/${input.id}`);
  },
};

export default personGet;
