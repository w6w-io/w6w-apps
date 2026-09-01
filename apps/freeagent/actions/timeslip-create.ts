import type { ActionDefinition } from "@w6w/types";
import { compact, FreeAgentClient, ref } from "../lib/client.ts";

interface Input {
  taskId: string;
  userId: string;
  projectId: string;
  datedOn: string;
  hours: number;
  comment?: string;
}

const timeslipCreate: ActionDefinition<Input> = {
  key: "timeslip-create",
  type: "perform",
  resource: "timeslip",
  title: "Create Timeslip",
  description: "Log time worked on a task.",
  // FreeAgent mints a new timeslip id per call and offers no request key, so
  // a retry logs the time twice.
  idempotent: false,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
    { key: "userId", label: "User ID", type: "string", required: true },
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "datedOn", label: "Dated on", type: "date", required: true },
    {
      key: "hours",
      label: "Hours",
      type: "number",
      required: true,
      hint: "E.g. 1.5 for 1 hour 30 minutes.",
    },
    { key: "comment", label: "Comment", type: "string" },
  ],
  output: [{ key: "timeslip", type: "object", label: "Timeslip" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/timeslips", {
      method: "POST",
      body: {
        timeslip: {
          task: ref("tasks", input.taskId),
          user: ref("users", input.userId),
          project: ref("projects", input.projectId),
          dated_on: input.datedOn,
          hours: input.hours,
          ...compact({ comment: input.comment }),
        },
      },
    });
  },
};

export default timeslipCreate;
