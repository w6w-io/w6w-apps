import type { ActionDefinition } from "@w6w/types";
import { csv, FirefliesClient, intArg } from "../lib/client.ts";

interface Input {
  meetingLink: string;
  title?: string;
  meetingPassword?: string;
  duration?: number;
  language?: string;
  attendeeEmails?: string;
}

/** `duration` inlined as an integer literal — see `intArg` in `lib/client.ts`. */
function buildMutation(input: Input): string {
  return `
    mutation AddToLiveMeeting(
      $meetingLink: String!
      $title: String
      $meetingPassword: String
      $language: String
      $attendees: [Attendee]
    ) {
      addToLiveMeeting(
        meeting_link: $meetingLink
        title: $title
        meeting_password: $meetingPassword
        language: $language
        attendees: $attendees${intArg("duration", input.duration)}
      ) {
        success
      }
    }
  `;
}

const liveMeetingJoin: ActionDefinition<Input> = {
  key: "live-meeting-join",
  type: "perform",
  resource: "live-meeting",
  title: "Send Notetaker to a Live Meeting",
  description: "Add the Fireflies bot to a meeting that is already running.",
  // Sending the bot twice puts it in the meeting twice; there is no client key
  // to deduplicate on.
  idempotent: false,
  params: [
    {
      key: "meetingLink",
      label: "Meeting link",
      type: "string",
      required: true,
      hint:
        "Google Meet, Zoom, Teams, … An unsupported platform fails with `unsupported_platform`.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      validation: { maxLength: 256 },
      hint: "Names the resulting transcript. Auto-generated if blank.",
    },
    {
      key: "meetingPassword",
      label: "Meeting password",
      type: "secret",
      validation: { maxLength: 32 },
      hint: "Only if the meeting needs one.",
    },
    {
      key: "duration",
      label: "Duration (minutes)",
      type: "number",
      row: "opts",
      validation: { integer: true, min: 15, max: 120 },
      hint: "How long the bot stays. Defaults to 60. Fireflies accepts 15–120.",
    },
    {
      key: "language",
      label: "Language code",
      type: "string",
      row: "opts",
      validation: { maxLength: 5 },
      hint: "Defaults to English.",
    },
    {
      key: "attendeeEmails",
      label: "Expected attendee emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "addToLiveMeeting.success", type: "boolean", label: "Bot dispatched" },
  ],

  execute(input, ctx) {
    ctx.log("info", "adding Fireflies notetaker to a live meeting");
    // Rate limited by Fireflies to 3 requests per 20 minutes — a retry loop
    // here will earn `too_many_requests` rather than a second bot.
    return new FirefliesClient(ctx).query(buildMutation(input), {
      meetingLink: input.meetingLink,
      title: input.title,
      meetingPassword: input.meetingPassword,
      language: input.language,
      attendees: csv(input.attendeeEmails)?.map((email) => ({ email })),
    });
  },
};

export default liveMeetingJoin;
