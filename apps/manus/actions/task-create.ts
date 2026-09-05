import type { ActionDefinition } from "@w6w/types";
import {
  buildContent,
  compact,
  ManusClient,
  type TaskCreateResponse,
  toList,
} from "../lib/client.ts";
import { agentProfileOptions, attachmentParams, shareVisibilityOptions } from "../lib/params.ts";

/**
 * `POST /v2/task.create` — start a new task from a prompt. The task runs
 * asynchronously; poll it with `task-detail`/`task-list-messages`, or use
 * `webhook-create` instead of polling.
 *
 * This is the one Action that spends money: every call starts a fresh task,
 * whether or not an identical prompt was just sent — Manus's create endpoint
 * accepts no idempotency key of any kind. Retrying a timed-out call therefore
 * risks a second billed task, which is why `idempotent` is `false` here.
 *
 * A deliberately smaller surface than the full request schema: `content` only
 * supports plain text plus one optional file attachment (see
 * `lib/client.ts#buildContent` for why), and `structured_output_schema` takes
 * a raw JSON Schema object rather than a guided builder — a real but more
 * advanced feature (see the vendor's Structured Output guide) this app leaves
 * for a workflow author to paste in directly.
 */
interface Input {
  content: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  projectId?: string;
  locale?: string;
  interactiveMode?: boolean;
  hideInTaskList?: boolean;
  shareVisibility?: string;
  agentProfile?: string;
  title?: string;
  connectors?: string[] | string;
  enableSkills?: string[] | string;
  forceSkills?: string[] | string;
  taskReferences?: string[] | string;
  structuredOutputSchema?: Record<string, unknown>;
}

const taskCreate: ActionDefinition<Input, TaskCreateResponse> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Start a new Manus task from a prompt.",
  idempotent: false,
  params: [
    {
      key: "content",
      label: "Message",
      type: "text",
      required: true,
      hint: "What Manus should do — the message content the task starts with.",
    },
    ...attachmentParams,
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Auto-generated from the message if omitted.",
    },
    { key: "projectId", label: "Project ID", type: "string", advanced: true },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      advanced: true,
      placeholder: "en",
      hint: 'Output language, e.g. "en", "zh-CN", "ja". Defaults to the account locale.',
    },
    {
      key: "shareVisibility",
      label: "Share visibility",
      type: "select",
      options: shareVisibilityOptions,
      default: "private",
    },
    {
      key: "agentProfile",
      label: "Agent profile",
      type: "select",
      options: agentProfileOptions,
      default: "standard",
      advanced: true,
      hint: "Free personal accounts are downgraded to Lite regardless of what is requested here.",
    },
    {
      key: "interactiveMode",
      label: "Interactive mode",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "When on, the agent may pause and ask follow-up questions instead of proceeding " +
        "best-effort.",
    },
    {
      key: "hideInTaskList",
      label: "Hide from task list",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Keep the task out of the Manus webapp's task list. Still reachable via Task URL.",
    },
    {
      key: "connectors",
      label: "Connectors",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "Connector IDs to enable, from Connector List. Omit to use the project's or " +
        "account's defaults.",
    },
    {
      key: "enableSkills",
      label: "Enable skills",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "Skill IDs to load, from Skill List. Omit to use the account's enabled skills.",
    },
    {
      key: "forceSkills",
      label: "Force skills",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "Skill IDs the agent must invoke during this task.",
    },
    {
      key: "taskReferences",
      label: "Referenced task IDs",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "Up to 20 bare 22-character task IDs whose conversation/files this task may browse.",
    },
    {
      key: "structuredOutputSchema",
      label: "Structured output schema",
      type: "json",
      advanced: true,
      hint: "A JSON Schema object (all properties required, additionalProperties: false) — see " +
        "the Structured Output guide.",
    },
  ],
  output: [
    { key: "task_id", type: "string", label: "Task ID" },
    { key: "task_title", type: "string", label: "Task title" },
    { key: "task_url", type: "string", label: "URL to view the task in the Manus webapp" },
    {
      key: "share_url",
      type: "string",
      label: "Public share URL, when share_visibility is not private",
    },
    { key: "share_visibility", type: "string", label: "Actual share visibility" },
  ],

  execute(input, ctx) {
    return new ManusClient(ctx).request<TaskCreateResponse>("/v2/task.create", {
      method: "POST",
      body: compact({
        message: compact({
          content: buildContent(input.content, {
            fileId: input.fileId,
            fileUrl: input.fileUrl,
            fileName: input.fileName,
          }),
          connectors: toList(input.connectors),
          enable_skills: toList(input.enableSkills),
          force_skills: toList(input.forceSkills),
          task_references: toList(input.taskReferences),
        }),
        project_id: input.projectId,
        locale: input.locale,
        interactive_mode: input.interactiveMode,
        hide_in_task_list: input.hideInTaskList,
        share_visibility: input.shareVisibility,
        agent_profile: input.agentProfile,
        title: input.title,
        structured_output_schema: input.structuredOutputSchema,
      }),
    });
  },
};

export default taskCreate;
