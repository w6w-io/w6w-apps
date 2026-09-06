import type { ActionDefinition } from "@w6w/types";
import { FolkClient } from "../lib/client.ts";

interface Output {
  id: string;
  name?: string;
  email: string;
}

/**
 * `GET /user` — the one operation not scoped under `/network/{networkId}`.
 * The OAS documents its success response as status `201` (unusual for a
 * GET, and almost certainly a copy-paste artifact in folk's own spec) —
 * `FolkClient` only checks `res.ok`, so this is handled without any
 * special-casing here.
 */
const getUser: ActionDefinition<Record<string, never>> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Get the folk user the API key belongs to.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(_input, ctx) {
    return new FolkClient(ctx).request<Output>("/user");
  },
};

export default getUser;
