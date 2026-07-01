import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  userId: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  username?: string;
  url?: string;
  description?: string;
  nickname?: string;
  slug?: string;
}

interface UserBody {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  username?: string;
  url?: string;
  description?: string;
  nickname?: string;
  slug?: string;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update fields on an existing user.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "name", label: "Display Name", type: "string" },
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "password", label: "Password", type: "secret" },
    { key: "username", label: "Username", type: "string" },
    { key: "url", label: "Website URL", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "slug", label: "Slug", type: "string" },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    const body: UserBody = { id: input.userId };
    if (input.name !== undefined) body.name = input.name;
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.email !== undefined) body.email = input.email;
    if (input.password !== undefined) body.password = input.password;
    if (input.username !== undefined) body.username = input.username;
    if (input.url !== undefined) body.url = input.url;
    if (input.description !== undefined) body.description = input.description;
    if (input.nickname !== undefined) body.nickname = input.nickname;
    if (input.slug !== undefined) body.slug = input.slug;
    return client.request(`/users/${input.userId}`, { method: "POST", body });
  },
};

export default userUpdate;
