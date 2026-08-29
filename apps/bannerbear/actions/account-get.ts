import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface AccountBody {
  uid?: string;
  workspace?: string;
  plan?: string;
  quota?: { max?: number; current?: number; remaining?: number };
  api_key?: { name?: string; scopes?: string[]; allowed_origins?: string[] };
  created_at?: string;
}

/**
 * `GET /account` — workspace identity, plan, render quota, and the calling
 * key's own scopes/origin restrictions. Needs no resource scope; see
 * `auth/bearer-token.ts` for why. Returns no credential material.
 */
const action: ActionDefinition<Record<string, never>, AccountBody> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Workspace name, plan, render quota, and the calling API key's own scopes.",
  params: [],
  output: [
    { key: "uid", type: "string", label: "Workspace UID" },
    { key: "workspace", type: "string", label: "Workspace name" },
    { key: "plan", type: "string", label: "Plan" },
    { key: "quota", type: "object", label: "Render quota" },
    { key: "api_key", type: "object", label: "Calling key's scopes/origins" },
  ],

  async execute(_input, ctx) {
    return await new BannerbearClient(ctx).json<AccountBody>("/account");
  },
};

export default action;
