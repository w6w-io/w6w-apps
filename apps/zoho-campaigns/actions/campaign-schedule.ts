import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { campaignKey } from "../lib/params.ts";

interface Input {
  campaignKey: string;
  scheduleDate: string;
  scheduleHour: number;
  scheduleMinute: number;
  amPm: "AM" | "PM";
  isTimewarp?: boolean;
  sendingTz?: string;
}

interface Output {
  message?: string;
  campaignStatus?: string;
}

/**
 * `POST /sendcampaign?isschedule=true` — verified against
 * `https://www.zoho.com/campaigns/help/developers/schedule-campaign.html`.
 * The same endpoint `campaign-send` calls, with the schedule fields and the
 * `isschedule` query flag added.
 */
const campaignSchedule: ActionDefinition<Input, Output> = {
  key: "campaign-schedule",
  type: "perform",
  resource: "campaign",
  title: "Schedule Campaign",
  description: "Schedule a campaign to send at a future date and time.",
  idempotent: false,
  params: [
    campaignKey,
    {
      key: "scheduleDate",
      label: "Schedule date",
      type: "string",
      required: true,
      hint: "mm/dd/yyyy",
    },
    {
      key: "scheduleHour",
      label: "Hour",
      type: "number",
      required: true,
      hint: "1-12",
      validation: { min: 1, max: 12 },
    },
    {
      key: "scheduleMinute",
      label: "Minute",
      type: "number",
      required: true,
      hint: "0-55",
      validation: { min: 0, max: 55 },
    },
    {
      key: "amPm",
      label: "AM/PM",
      type: "select",
      required: true,
      options: [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }],
    },
    {
      key: "isTimewarp",
      label: "Use recipient's time zone",
      type: "boolean",
      hint: "Send at the given time in each recipient's own time zone.",
    },
    {
      key: "sendingTz",
      label: "Sending time zone",
      type: "string",
      hint: 'e.g. "Asia/Kolkata" — the time zone the schedule is given in.',
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "campaignStatus", type: "string", label: "Campaign status" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { message?: string; campaign_status?: string }
    >("sendcampaign", {
      method: "POST",
      query: {
        isschedule: true,
        campaignkey: input.campaignKey,
        scheduleDate: input.scheduleDate,
        scheduleHour: input.scheduleHour,
        scheduleMinute: input.scheduleMinute,
        am_pm: input.amPm,
        istimewarp: input.isTimewarp,
        sendingTZ: input.sendingTz,
      },
    });
    return { message: body.message, campaignStatus: body.campaign_status };
  },
};

export default campaignSchedule;
