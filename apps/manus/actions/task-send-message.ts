import type { ActionDefinition } from "@w6w/types";
import {
  buildContent,
  compact,
  ManusClient,
  type TaskSendMessageResponse,
  toList,
} from "../lib/client.ts";
import { agentProfileOptions, attachmentParams, taskIdParam } from "../lib/params.ts";

/**
 * `POST /v2/task.sendMessage` — send a follow-up message to continue a
 * multi-turn conversation, or to reply when a task's `waiting_for_event_type`
 * is `messageAskUser` (for other waiting types, use `task-confirm-action`).
 *
 * `idempotent: false`: like `task-create`, this accepts no idempotency key,
 * and a retried call would send a second message / duplicate instruction to
 * an already-resumed agent.
 *
 * `connectors` here behaves differently than on `task-create`: a non-empty
 * list OVERRIDES the task's connectors for this and later turns; leaving it
 * empty REUSES whatever was configured at create time (it does not clear
 * them). Use "Clear connectors" to remove them all instead.
 */
interface Input {
  taskId: string;
  content: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  agentProfile?: string;
  structuredOutputSchema?: Record<string, unknown>;
  connectors?: string[] | string;
  clearConnectors?: boolean;
}

const taskSendMessage: ActionDefinition<Input, TaskSendMessageResponse> = {
  key: "task-send-message",
  type: "perform",
  resource: "task",
  title: "Send Message",
  description: "Send a follow-up message to continue a task's conversation.",
  idempotent: false,
  params: [
    taskIdParam,
    { key: "content", label: "Message", type: "text", required: true },
    ...attachmentParams,
    {
      key: "agentProfile",
      label: "Agent profile override",
      type: "select",
      options: agentProfileOptions,
      advanced: true,
      hint: "Overrides the task's profile for this and later turns. Leave empty to keep the " +
        "current profile.",
    },
    {
      key: "connectors",
      label: "Connectors (override)",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "A non-empty list REPLACES the task's connectors. Leave empty to keep the ones " +
        "configured at creation.",
    },
    {
      key: "clearConnectors",
      label: "Clear connectors",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Removes all connectors from this task. Conflicts with a non-empty Connectors " +
        "override above.",
    },
    {
      key: "structuredOutputSchema",
      label: "Structured output schema",
      type: "json",
      advanced: true,
      hint: "Arms this schema for the next time the task finishes. Replaces any previously-armed " +
        "schema; omit to leave the current one unchanged.",
    },
  ],
  output: [
    { key: "task_id", type: "string", label: "Task ID" },
  ],

  execute(input, ctx) {
    return new ManusClient(ctx).request<TaskSendMessageResponse>("/v2/task.sendMessage", {
      method: "POST",
      body: compact({
        task_id: input.taskId,
        message: compact({
          content: buildContent(input.content, {
            fileId: input.fileId,
            fileUrl: input.fileUrl,
            fileName: input.fileName,
          }),
          connectors: toList(input.connectors),
        }),
        agent_profile: input.agentProfile,
        structured_output_schema: input.structuredOutputSchema,
        clear_connectors: input.clearConnectors,
      }),
    });
  },
};

export default taskSendMessage;
