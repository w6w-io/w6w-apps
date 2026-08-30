import type { ActionDefinition } from "@w6w/types";
import { WaveClient } from "../lib/client.ts";

interface Output {
  id: string;
  firstName: string | null;
  lastName: string | null;
  defaultEmail: string | null;
  createdAt: string;
  modifiedAt: string;
}

/** Root-level — Wave's own example for this exact query. No `businessId`: `user` resolves off the token. */
const QUERY = `
  query GetUser {
    user {
      id
      firstName
      lastName
      defaultEmail
      createdAt
      modifiedAt
    }
  }
`;

const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Retrieve the Wave user the connected account belongs to.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User id" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "defaultEmail", type: "string", label: "Default email" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "modifiedAt", type: "string", label: "Modified at" },
  ],

  async execute(_input, ctx) {
    const data = await new WaveClient(ctx).query<{ user: Output }>(QUERY);
    return data.user;
  },
};

export default userGet;
