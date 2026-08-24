import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";
import { robotIdParam, taskIdParam } from "../lib/params.ts";

/**
 * `GET /v2/robots/{robotId}/tasks/{taskId}` — a task's details and captured
 * data.
 *
 * `capturedTexts` and `capturedLists` carry the actual extracted data;
 * `capturedScreenshots` carries signed, time-limited S3 URLs (expire well
 * under an hour) rather than the images themselves — fetch them promptly if
 * the next step needs the bytes. Tasks time out with an error after 15 minutes
 * (or your plan's maximum), and `finishedAt` stays `null` while a task is
 * still running.
 */
interface Input {
  robotId: string;
  taskId: string;
}

interface Output {
  id: string;
  status?: string;
  robotId: string;
  createdAt: number;
  startedAt?: number | null;
  finishedAt?: number | null;
  userFriendlyError?: string | null;
  capturedTexts?: Record<string, unknown>;
  capturedLists?: Record<string, unknown>;
  capturedScreenshots?: Record<string, unknown>;
}

const taskGet: ActionDefinition<Input, Output> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve a task's details and any data it captured.",
  params: [robotIdParam, taskIdParam],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "status", type: "string", label: "Task status" },
    { key: "userFriendlyError", type: "string", label: "Error (if failed)" },
    { key: "capturedTexts", type: "object", label: "Captured texts" },
    { key: "capturedLists", type: "object", label: "Captured lists" },
    { key: "capturedScreenshots", type: "object", label: "Captured screenshots" },
  ],

  async execute(input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ result: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/tasks/${encodeURIComponent(input.taskId)}`,
    );
    return body.result;
  },
};

export default taskGet;
