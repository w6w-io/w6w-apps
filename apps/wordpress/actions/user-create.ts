import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  username: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  url?: string;
  description?: string;
  nickname?: string;
  slug?: string;
}

interface UserBody {
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  url?: string;
  description?: string;
  nickname?: string;
  slug?: string;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a new WordPress user.",
  idempotent: false,
  params: [
    { key: "username", label: "Username", type: "string", required: true },
    { key: "name", label: "Display Name", type: "string", required: true },
    { key: "firstName", label: "First Name", type: "string", required: true },
    { key: "lastName", label: "Last Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "password", label: "Password", type: "secret", required: true },
    { key: "url", label: "Website URL", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "slug", label: "Slug", type: "string" },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    const body: UserBody = {
      username: input.username,
      name: input.name,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      password: input.password,
    };
    if (input.url !== undefined) body.url = input.url;
    if (input.description !== undefined) body.description = input.description;
    if (input.nickname !== undefined) body.nickname = input.nickname;
    if (input.slug !== undefined) body.slug = input.slug;
    return client.request("/users", { method: "POST", body });
  },
};

export default userCreate;
