import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  NutshellClient,
  type NutshellEntity,
  parseJsonObject,
  VALUES_PARAM,
} from "../lib/client.ts";

interface Input {
  name?: string;
  description?: string;
  phone?: string;
  url?: string;
  tags?: string;
  values?: unknown;
}

/**
 * `newAccount(account)` — create an Account (company).
 *
 * All fields are optional, same as `newLead` — "it is possible to create a
 * nameless account with no useful information." `phone` and `url` are
 * documented as multi-value fields; a comma-separated list here becomes the
 * array Nutshell expects.
 */
const createAccount: ActionDefinition<Input, NutshellEntity> = {
  key: "create-account",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description: "Create a new Account (company). Every field is optional.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "phone",
      label: "Phone numbers",
      type: "string",
      hint: "Comma-separated phone numbers.",
    },
    { key: "url", label: "URLs", type: "string", hint: "Comma-separated website/social URLs." },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names. Tags must already exist in Nutshell.",
    },
    { ...VALUES_PARAM },
  ],
  output: [
    { key: "id", type: "number", label: "New Account ID" },
    { key: "rev", type: "string", label: "Rev (needed to later update this Account)" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const account = {
      ...compact({ name: input.name, description: input.description }),
      ...(input.phone
        ? { phone: input.phone.split(",").map((p) => p.trim()).filter(Boolean) }
        : {}),
      ...(input.url ? { url: input.url.split(",").map((u) => u.trim()).filter(Boolean) } : {}),
      ...(input.tags ? { tags: input.tags.split(",").map((t) => t.trim()).filter(Boolean) } : {}),
      ...parseJsonObject(input.values, "Additional fields"),
    };

    return new NutshellClient(ctx).call<NutshellEntity>("newAccount", { account });
  },
};

export default createAccount;
