import type { ActionDefinition } from "@w6w/types";
import { asJson, BrowseAiClient } from "../lib/client.ts";
import { inputParametersParam, robotIdParam } from "../lib/params.ts";

/**
 * `POST /v2/robots/{robotId}/monitors` — add another monitor to a robot.
 *
 * A robot created as a "monitoring robot" already ships with one monitor;
 * this adds an *additional* one, typically with different `inputParameters`
 * (a different URL to watch) and its own `schedule`.
 *
 * `schedule` takes an iCalendar `RRULE` string (e.g.
 * `FREQ=HOURLY;INTERVAL=1;BYWEEKDAY=MO,TU,WE,TH,FR`). The vendor's OpenAPI
 * document also still lists a `schedules` array of `{type: "FIXED_INTERVAL",
 * everyMinutes}` objects, explicitly marked **deprecated** — this app only
 * ever sends `schedule`, the form the vendor is migrating callers to.
 *
 * `403 schedule_interval_below_minimum` means the requested schedule runs
 * more often than the team's plan allows; it surfaces with that exact code
 * rather than a bare 403.
 */
interface Input {
  robotId: string;
  name: string;
  inputParameters: unknown;
  schedule?: string;
  notifyOnCapturedScreenshotChange: boolean;
  notifyOnCapturedTextChange: boolean;
  capturedScreenshotNotificationThreshold: number;
}

interface Output {
  id: string;
  name: string;
  status?: string;
  createdAt: number;
}

const monitorCreate: ActionDefinition<Input, Output> = {
  key: "monitor-create",
  type: "perform",
  resource: "monitor",
  title: "Create Monitor",
  description: "Add a new monitor to a robot.",
  idempotent: false,
  params: [
    robotIdParam,
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 200 },
      placeholder: "Monitor Products",
    },
    { ...inputParametersParam, required: true },
    {
      key: "schedule",
      label: "Schedule (RRULE)",
      type: "string",
      placeholder: "FREQ=HOURLY;INTERVAL=1;BYWEEKDAY=MO,TU,WE,TH,FR",
      hint: "An iCalendar RRULE string. Leave empty to leave the monitor unscheduled.",
    },
    {
      key: "notifyOnCapturedScreenshotChange",
      label: "Notify on screenshot change",
      type: "boolean",
      required: true,
    },
    {
      key: "notifyOnCapturedTextChange",
      label: "Notify on text change",
      type: "boolean",
      required: true,
    },
    {
      key: "capturedScreenshotNotificationThreshold",
      label: "Screenshot change threshold (%)",
      type: "number",
      required: true,
      validation: { min: 0, max: 100 },
      hint: "Notify only when a screenshot changes by more than this percentage.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Monitor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const inputParameters = asJson(input.inputParameters, "Input parameters");
    const body = await new BrowseAiClient(ctx).request<{ monitor: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/monitors`,
      {
        method: "POST",
        body: {
          name: input.name,
          inputParameters,
          schedule: input.schedule,
          notifyOnCapturedScreenshotChange: input.notifyOnCapturedScreenshotChange,
          notifyOnCapturedTextChange: input.notifyOnCapturedTextChange,
          capturedScreenshotNotificationThreshold: input.capturedScreenshotNotificationThreshold,
        },
      },
    );
    return body.monitor;
  },
};

export default monitorCreate;
