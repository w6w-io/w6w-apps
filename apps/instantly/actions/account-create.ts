import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, InstantlyClient } from "../lib/client.ts";
import { providerCodeOptions } from "../lib/params.ts";

/**
 * `POST /api/v2/accounts` — connect a mailbox as a sending account.
 *
 * This is the one action in this app that necessarily carries a raw
 * credential as a request field rather than through the Auth `sign` hook:
 * `imap_password`/`smtp_password` are the MAILBOX's own IMAP/SMTP password
 * (or app password), which is data this action provisions INTO Instantly —
 * it is not this app's own Connection credential, so it cannot go through
 * `sign`. Both fields are declared `type: "secret"` so the host masks and
 * encrypts them the same way it does the Connection's own API key.
 */
interface Input {
  email: string;
  first_name: string;
  last_name: string;
  provider_code: number;
  imap_username: string;
  imap_password: string;
  imap_host: string;
  imap_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_host: string;
  smtp_port: number;
  daily_limit?: number;
  signature?: string;
  reply_to?: string;
  skip_cname_check?: boolean;
  warmup?: unknown;
}

const accountCreate: ActionDefinition<Input> = {
  key: "account-create",
  type: "perform",
  resource: "account",
  title: "Connect Sending Account",
  description: "Connect a mailbox to the workspace over IMAP/SMTP as a sending account.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "first_name", label: "First name", type: "string", required: true },
    { key: "last_name", label: "Last name", type: "string", required: true },
    {
      key: "provider_code",
      label: "Provider",
      type: "select",
      required: true,
      options: providerCodeOptions,
    },
    { key: "imap_username", label: "IMAP username", type: "string", required: true },
    {
      key: "imap_password",
      label: "IMAP password",
      type: "secret",
      required: true,
      hint: "The mailbox's own IMAP password or app password — not this Connection's API key.",
    },
    { key: "imap_host", label: "IMAP host", type: "string", required: true },
    {
      key: "imap_port",
      label: "IMAP port",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    { key: "smtp_username", label: "SMTP username", type: "string", required: true },
    {
      key: "smtp_password",
      label: "SMTP password",
      type: "secret",
      required: true,
      hint: "The mailbox's own SMTP password or app password — not this Connection's API key.",
    },
    { key: "smtp_host", label: "SMTP host", type: "string", required: true },
    {
      key: "smtp_port",
      label: "SMTP port",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    { key: "daily_limit", label: "Daily send limit", type: "number" },
    { key: "signature", label: "Signature (HTML)", type: "text" },
    { key: "reply_to", label: "Reply-to address", type: "string" },
    { key: "skip_cname_check", label: "Skip CNAME check", type: "boolean" },
    {
      key: "warmup",
      label: "Warmup config (JSON)",
      type: "json",
      hint: '{ "limit": 100, "advanced": { "warm_ctd": false, "read_emulation": true, ... } } — ' +
        "see the Instantly API reference for the full warmup shape.",
    },
  ],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    const { warmup, ...rest } = input;
    ctx.log("info", "connecting sending account", { email: input.email });
    return new InstantlyClient(ctx).json("/accounts", {
      method: "POST",
      body: { ...rest, warmup: asOptionalJson(warmup, "Warmup config") },
    });
  },
};

export default accountCreate;
