import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, CannyClient } from "../lib/client.ts";
import { idOutput } from "../lib/output.ts";

/**
 * `POST /v1/users/create_or_update` — create a user, or update one that
 * already exists, and return its Canny id.
 *
 * Canny also documents `users/find_or_create` with identical arguments, but
 * marks it **deprecated** in favour of this endpoint — this action only ever
 * calls `create_or_update`.
 *
 * One of `email`, `userID` or `id` must be provided to update an existing
 * user; `name` is otherwise required (per Canny's own Arguments table it
 * carries no "(optional)" marker, unlike every other field here). The email,
 * name and avatarURL of an *admin* user cannot be changed through this API —
 * Canny silently ignores those fields for admins rather than erroring.
 */
interface Input {
  name: string;
  id?: string;
  email?: string;
  userID?: string;
  alias?: string;
  avatarURL?: string;
  companies?: unknown;
  created?: string;
  customFields?: unknown;
}

const userUpsert: ActionDefinition<Input> = {
  key: "user-upsert",
  type: "perform",
  resource: "user",
  title: "Upsert User",
  description:
    "Create a user, or update one identified by email, userID or id. Returns the user's Canny id.",
  idempotent: true,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 50 },
    },
    {
      key: "id",
      label: "User ID (Canny)",
      type: "string",
      hint: "Set to update an existing user by its Canny id.",
    },
    { key: "email", label: "Email", type: "string", hint: "Set to create-or-update by email." },
    {
      key: "userID",
      label: "User ID (yours)",
      type: "string",
      hint: "Set to create-or-update by your application's own user id.",
    },
    {
      key: "alias",
      label: "Alias",
      type: "string",
      advanced: true,
      hint: "Shown in place of the real name on anonymized boards.",
    },
    { key: "avatarURL", label: "Avatar URL", type: "string", advanced: true },
    {
      key: "companies",
      label: "Companies",
      type: "json",
      advanced: true,
      hint: "Array of {id, name, created?, customFields?, domain?, monthlySpend?} the user " +
        "belongs to. Omitting a company the user is currently linked to does NOT unlink it — " +
        "use Remove User From Company for that.",
    },
    {
      key: "created",
      label: "Created at",
      type: "datetime",
      advanced: true,
      hint: "The date this user was created in your system.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: "Field names must be 0-30 characters; string values under 200 characters.",
    },
  ],
  output: idOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post<{ id: string }>("/users/create_or_update", {
      name: input.name,
      id: input.id,
      email: input.email,
      userID: input.userID,
      alias: input.alias,
      avatarURL: input.avatarURL,
      companies: asOptionalJson(input.companies, "companies"),
      created: input.created,
      customFields: asOptionalJson(input.customFields, "customFields"),
    });
  },
};

export default userUpsert;
