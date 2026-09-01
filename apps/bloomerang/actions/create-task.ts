import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient, compact } from "../lib/client.ts";

type Channel =
  | "Email"
  | "MassEmail"
  | "Phone"
  | "TextMessage"
  | "Mail"
  | "InPerson"
  | "SocialMedia"
  | "Website"
  | "Twitter"
  | "Other"
  | "EngagementSurveyEmail"
  | "EngagementSurvey";

type Purpose =
  | "Acknowledgement"
  | "ImpactCultivation"
  | "Newsletter"
  | "Receipt"
  | "Solicitation"
  | "SpecialEvent"
  | "VolunteerActivity"
  | "PledgeReminder"
  | "Welcome"
  | "BenevonPointOfEntry"
  | "BenevonFollowUp"
  | "BenevonAskEvent"
  | "BenevonOneOnOneAsk"
  | "BenevonOngoingCultivation"
  | "Other";

interface Input {
  accountId?: number;
  subject: string;
  dueDate?: string;
  note?: string;
  channel?: Channel;
  purpose?: Purpose;
  userId?: number;
}

/**
 * `POST /task` — add a Task, optionally against a constituent.
 *
 * Confirmed against the OpenAPI document: `Subject`, `DueDate`, `Note`,
 * `Channel` and `Purpose` (both fixed enums, reproduced above verbatim from
 * the schema) live on the task itself, `UserId` assigns the task to a
 * Bloomerang user, and `AccountId` links it to a constituent (present but
 * optional — Bloomerang supports unlinked tasks).
 *
 * Not idempotent: each call creates a new Task; Bloomerang offers no
 * idempotency key on this endpoint.
 */
const createTask: ActionDefinition<Input> = {
  key: "create-task",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Add a task, optionally linked to a constituent and assigned to a user.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "accountId",
      label: "Constituent ID",
      type: "number",
      hint: "Links the task to this constituent's timeline. Omit for an unlinked task.",
    },
    { key: "dueDate", label: "Due date", type: "date" },
    { key: "note", label: "Note", type: "text" },
    {
      key: "channel",
      label: "Channel",
      type: "select",
      options: [
        { value: "Email", label: "Email" },
        { value: "MassEmail", label: "Mass Email" },
        { value: "Phone", label: "Phone" },
        { value: "TextMessage", label: "Text Message" },
        { value: "Mail", label: "Mail" },
        { value: "InPerson", label: "In Person" },
        { value: "SocialMedia", label: "Social Media" },
        { value: "Website", label: "Website" },
        { value: "Twitter", label: "Twitter" },
        { value: "EngagementSurveyEmail", label: "Engagement Survey Email" },
        { value: "EngagementSurvey", label: "Engagement Survey" },
        { value: "Other", label: "Other" },
      ],
    },
    {
      key: "purpose",
      label: "Purpose",
      type: "select",
      options: [
        { value: "Acknowledgement", label: "Acknowledgement" },
        { value: "ImpactCultivation", label: "Impact Cultivation" },
        { value: "Newsletter", label: "Newsletter" },
        { value: "Receipt", label: "Receipt" },
        { value: "Solicitation", label: "Solicitation" },
        { value: "SpecialEvent", label: "Special Event" },
        { value: "VolunteerActivity", label: "Volunteer Activity" },
        { value: "PledgeReminder", label: "Pledge Reminder" },
        { value: "Welcome", label: "Welcome" },
        { value: "BenevonPointOfEntry", label: "Benevon Point Of Entry" },
        { value: "BenevonFollowUp", label: "Benevon Follow Up" },
        { value: "BenevonAskEvent", label: "Benevon Ask Event" },
        { value: "BenevonOneOnOneAsk", label: "Benevon One On One Ask" },
        { value: "BenevonOngoingCultivation", label: "Benevon Ongoing Cultivation" },
        { value: "Other", label: "Other" },
      ],
    },
    {
      key: "userId",
      label: "Assign to user ID",
      type: "number",
      hint: "Bloomerang user id the task is assigned to.",
    },
  ],
  output: [{ key: "Id", type: "number", label: "Task ID" }],

  execute(input, ctx) {
    const body = compact({
      AccountId: input.accountId,
      Subject: input.subject,
      DueDate: input.dueDate,
      Note: input.note,
      Channel: input.channel,
      Purpose: input.purpose,
      UserId: input.userId,
    });
    return new BloomerangClient(ctx).request("/task", { method: "POST", body });
  },
};

export default createTask;
