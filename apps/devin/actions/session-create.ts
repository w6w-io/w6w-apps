import type { ActionDefinition } from "@w6w/types";
import { compact, DevinClient, type DevinSession, toList } from "../lib/client.ts";
import { devinModeOptions } from "../lib/params.ts";

/**
 * `POST /v3/organizations/{org_id}/sessions` — start a new Devin session from
 * a natural-language prompt.
 *
 * This is the one Action that spends money: every call creates a fresh,
 * billed VM and session, whether or not an identical prompt was just sent —
 * Devin's session-create endpoint accepts no idempotency key of any kind.
 * Retrying a timed-out call therefore risks a second paid session, which is
 * why `idempotent` is `false` here.
 *
 * A deliberately smaller surface than the full `SessionCreateRequest` schema:
 * left out are `create_as_user_id` (impersonating another org member —
 * requires the separate `ImpersonateOrgSessions` permission and is an
 * admin/automation-platform concern, not a workflow-step one),
 * `session_secrets` (inline, ephemeral secrets passed straight in the request
 * body — `secretIds` below, referencing secrets created once via
 * `secret-create`, keeps a credential out of every workflow run's params),
 * `child_playbook_id`, `bypass_approval`, `platform`, and
 * `structured_output_schema`/`structured_output_required` (a JSON-Schema
 * contract for the session's final answer — real, but a level of
 * configuration this app leaves for a future pass rather than guessing at a
 * useful default).
 */
interface Input {
  prompt: string;
  title?: string;
  tags?: string[] | string;
  playbookId?: string;
  devinMode?: string;
  maxAcuLimit?: number;
  repos?: string[] | string;
  resumable?: boolean;
  attachmentUrls?: string[] | string;
  secretIds?: string[] | string;
}

const sessionCreate: ActionDefinition<Input, DevinSession> = {
  key: "session-create",
  type: "perform",
  resource: "session",
  title: "Create Session",
  description: "Start a new Devin session from a prompt.",
  idempotent: false,
  params: [
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      required: true,
      hint: "What Devin should do — as specific as you'd be with a human engineer.",
    },
    { key: "title", label: "Title", type: "string" },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      options: [],
      config: { multiline: false },
      hint: "Free-form labels. Type a value and press enter — this list has no fixed options.",
    },
    {
      key: "repos",
      label: "Repositories",
      type: "multiselect",
      options: [],
      hint: "owner/repo for each repository Devin should have access to in this session.",
    },
    {
      key: "playbookId",
      label: "Playbook ID",
      type: "string",
      advanced: true,
      hint: "ID of an existing org playbook to follow, from Devin's Playbooks settings.",
    },
    {
      key: "devinMode",
      label: "Agent mode",
      type: "select",
      options: devinModeOptions,
      advanced: true,
      hint: "Leave empty to use the organization's default mode.",
    },
    {
      key: "maxAcuLimit",
      label: "Max ACU limit",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Caps the session's compute spend. Leave empty for the organization default.",
    },
    {
      key: "resumable",
      label: "Resumable",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Preserve the session's VM state after it stops so it can be resumed. Turn off for " +
        "disposable, one-shot sessions.",
    },
    {
      key: "attachmentUrls",
      label: "Attachment URLs",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "URLs from a prior attachment-upload call, or any URL Devin's session can fetch.",
    },
    {
      key: "secretIds",
      label: "Secret IDs",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "IDs of org secrets (from secret-create/secret-list) to make available in this " +
        "session, without ever putting the secret value in this workflow's params.",
    },
  ],
  output: [
    { key: "session_id", type: "string", label: "Session ID (devin-prefixed)" },
    { key: "status", type: "string", label: "Status" },
    { key: "url", type: "string", label: "URL to view the session" },
    { key: "acus_consumed", type: "number", label: "Compute units consumed so far" },
    { key: "pull_requests", type: "array", label: "Pull requests the session has opened" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
  ],

  execute(input, ctx) {
    return new DevinClient(ctx).org<DevinSession>("/sessions", {
      method: "POST",
      body: compact({
        prompt: input.prompt,
        title: input.title,
        tags: toList(input.tags),
        repos: toList(input.repos),
        playbook_id: input.playbookId,
        devin_mode: input.devinMode,
        max_acu_limit: input.maxAcuLimit,
        resumable: input.resumable,
        attachment_urls: toList(input.attachmentUrls),
        secret_ids: toList(input.secretIds),
      }),
    });
  },
};

export default sessionCreate;
