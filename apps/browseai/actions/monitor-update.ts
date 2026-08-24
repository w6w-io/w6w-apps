import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BrowseAiClient, compact } from "../lib/client.ts";
import { monitorIdParam, monitorStatusOptions, robotIdParam } from "../lib/params.ts";

/**
 * `PATCH /v2/robots/{robotId}/monitors/{monitorId}` — update a monitor.
 *
 * Every field in `MonitorUpdateBodyParams` is optional and nullable: send only
 * what you want to change. Setting `status` to `paused` stops the monitor from
 * running until it (or a human) sets it back to `active`; the vendor's own
 * `Monitor.pausedReason` explains why a monitor paused itself
 * (`lowCredits`, `tooManyFailures`, `userInactivity`), which `monitor-get`
 * surfaces. Repeating the same body always lands on the same resulting
 * monitor, which is what makes this idempotent.
 */
interface Input {
  robotId: string;
  monitorId: string;
  name?: string;
  status?: string;
  inputParameters?: unknown;
  schedule?: string;
  notifyOnCapturedScreenshotChange?: boolean;
  notifyOnCapturedTextChange?: boolean;
  capturedScreenshotNotificationThreshold?: number;
}

interface Output {
  id: string;
  name: string;
  status?: string;
}

const monitorUpdate: ActionDefinition<Input, Output> = {
  key: "monitor-update",
  type: "perform",
  resource: "monitor",
  title: "Update Monitor",
  description: "Update a monitor. Only the fields you set are changed.",
  idempotent: true,
  params: [
    robotIdParam,
    monitorIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "status", label: "Status", type: "select", options: monitorStatusOptions },
    { key: "inputParameters", label: "Input parameters", type: "json" },
    {
      key: "schedule",
      label: "Schedule (RRULE)",
      type: "string",
      placeholder: "FREQ=HOURLY;INTERVAL=1;BYWEEKDAY=MO,TU,WE,TH,FR",
    },
    {
      key: "notifyOnCapturedScreenshotChange",
      label: "Notify on screenshot change",
      type: "boolean",
    },
    { key: "notifyOnCapturedTextChange", label: "Notify on text change", type: "boolean" },
    {
      key: "capturedScreenshotNotificationThreshold",
      label: "Screenshot change threshold (%)",
      type: "number",
      validation: { min: 0, max: 100 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Monitor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const inputParameters = asOptionalJson(input.inputParameters, "Input parameters");
    const body = await new BrowseAiClient(ctx).request<{ monitor: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/monitors/${
        encodeURIComponent(input.monitorId)
      }`,
      {
        method: "PATCH",
        body: compact({
          name: input.name,
          status: input.status,
          inputParameters,
          schedule: input.schedule,
          notifyOnCapturedScreenshotChange: input.notifyOnCapturedScreenshotChange,
          notifyOnCapturedTextChange: input.notifyOnCapturedTextChange,
          capturedScreenshotNotificationThreshold: input.capturedScreenshotNotificationThreshold,
        }),
      },
    );
    return body.monitor;
  },
};

export default monitorUpdate;
