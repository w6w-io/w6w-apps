import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  NutshellClient,
  type NutshellEntity,
  parseJsonObject,
  REV_PARAM,
  toId,
  VALUES_PARAM,
} from "../lib/client.ts";

interface Input {
  accountId: string | number;
  rev: string;
  name?: string;
  description?: string;
  note?: string;
  values?: unknown;
}

/**
 * `editAccount(accountId, rev, account)`.
 *
 * As with `editContact`/`editLead`, any multi-value field you supply here
 * (phone, email, URL — via Additional fields) REPLACES the full existing
 * list rather than appending to it; a `note` is appended and existing notes
 * are unaffected.
 */
const updateAccount: ActionDefinition<Input, NutshellEntity> = {
  key: "update-account",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description: "Edit an Account's name, description, or append a note. Requires the Rev from " +
    "your last read of this Account.",
  // See update-lead.ts: a same-rev retry after success fails with 409 rather than no-op'ing.
  idempotent: false,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { ...REV_PARAM },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "note",
      label: "Add note",
      type: "text",
      hint: "Appended to the Account's existing notes. Notes cannot be removed via the API.",
    },
    { ...VALUES_PARAM },
  ],
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "rev", type: "string", label: "New rev" },
  ],

  execute(input, ctx) {
    const account = {
      ...compact({ name: input.name, description: input.description, note: input.note }),
      ...parseJsonObject(input.values, "Additional fields"),
    };

    return new NutshellClient(ctx).call<NutshellEntity>("editAccount", {
      accountId: toId(input.accountId),
      rev: input.rev,
      account,
    });
  },
};

export default updateAccount;
