import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  ManusClient,
  type SearchResult,
  type TaskEvent,
  type TaskListMessagesResponse,
  toSearchResult,
} from "../lib/client.ts";
import { cursorParams, orderOptions, taskIdParam } from "../lib/params.ts";

/**
 * `GET /v2/task.listMessages` — the event history: user/assistant messages,
 * status changes and (with Verbose on) tool calls and plan updates. The way
 * to poll for progress after `task-create`/`task-send-message`.
 *
 * A `status_update` event's `agent_status: "waiting"` carries a
 * `waiting_for_event_id`/`waiting_for_event_type` in `status_detail` — pass
 * that id to `task-confirm-action` (or, for `messageAskUser`, reply with
 * `task-send-message` instead).
 */
interface Input {
  taskId: string;
  cursor?: string;
  limit?: number;
  order?: string;
  verbose?: boolean;
  slidesFormat?: string;
}

const taskListMessages: ActionDefinition<Input, SearchResult<TaskEvent>> = {
  key: "task-list-messages",
  type: "search",
  resource: "task",
  title: "List Messages",
  description:
    "List a task's event history: messages, status changes and (verbose) agent activity.",
  params: [
    taskIdParam,
    ...cursorParams(50, 200),
    { key: "order", label: "Order", type: "select", options: orderOptions, default: "desc" },
    {
      key: "verbose",
      label: "Verbose",
      type: "boolean",
      default: false,
      hint: "Include tool_used, plan_update, new_plan_step and explanation events.",
    },
    {
      key: "slidesFormat",
      label: "Slides format",
      type: "select",
      options: [
        { value: "html", label: "HTML (default)" },
        { value: "pptx", label: "PowerPoint (auto-converted)" },
      ],
      advanced: true,
    },
  ],
  output: [
    { key: "items", type: "array", label: "Events" },
    { key: "nextCursor", type: "string", label: "Pass into Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<TaskListMessagesResponse>(
      "/v2/task.listMessages",
      {
        query: compact({
          task_id: input.taskId,
          cursor: input.cursor,
          limit: input.limit,
          order: input.order,
          verbose: input.verbose,
          slides_format: input.slidesFormat,
        }),
      },
    );
    return toSearchResult(res.messages, res.has_more, res.next_cursor);
  },
};

export default taskListMessages;
