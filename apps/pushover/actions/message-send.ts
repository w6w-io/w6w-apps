import type { ActionDefinition } from "@w6w/types";
import { PushoverClient, toForm } from "../lib/client.ts";

/**
 * `POST /1/messages.json` — send a push notification.
 *
 * ## Emergency priority is a different contract
 *
 * `priority: 2` is not just "louder". Pushover repeats the notification every
 * `retry` seconds until the user acknowledges it or `expire` seconds pass, and
 * **both parameters become required** — omitting them is a rejection, not a
 * default. `retry` has a floor of 30 seconds. The response then carries a
 * `receipt` for polling acknowledgement.
 *
 * This action enforces the pair locally so the failure names the missing
 * parameter instead of arriving as a generic 4xx.
 *
 * ## The documented limits, which are hard truncation points
 *
 * Message 1024 UTF-8 characters, title 250, `url` 512, `url_title` 100. They are
 * stated as `validation` on the params so a workflow is stopped at the boundary
 * rather than having its text silently cut.
 *
 * ## Not idempotent, and not retryable either
 *
 * Pushover has no idempotency key — two calls send two notifications. And its
 * own guidance is that a 4xx must never be retried: "repeating your same request
 * will not work, no matter how many times you retry it." So a failure here is
 * the caller's to fix, not the runtime's to paper over.
 */
interface Input {
  message: string;
  title?: string;
  userOverride?: string;
  device?: string;
  priority?: string;
  retry?: number;
  expire?: number;
  sound?: string;
  url?: string;
  urlTitle?: string;
  html?: boolean;
  timestamp?: number;
  ttl?: number;
}

/** Pushover's built-in sounds, verbatim from the vendor's list. */
const soundOptions = [
  { value: "pushover", label: "Pushover (default)" },
  { value: "bike", label: "Bike" },
  { value: "bugle", label: "Bugle" },
  { value: "cashregister", label: "Cash Register" },
  { value: "classical", label: "Classical" },
  { value: "cosmic", label: "Cosmic" },
  { value: "falling", label: "Falling" },
  { value: "gamelan", label: "Gamelan" },
  { value: "incoming", label: "Incoming" },
  { value: "intermission", label: "Intermission" },
  { value: "magic", label: "Magic" },
  { value: "mechanical", label: "Mechanical" },
  { value: "pianobar", label: "Piano Bar" },
  { value: "siren", label: "Siren" },
  { value: "spacealarm", label: "Space Alarm" },
  { value: "tugboat", label: "Tug Boat" },
  { value: "alien", label: "Alien Alarm (long)" },
  { value: "climb", label: "Climb (long)" },
  { value: "persistent", label: "Persistent (long)" },
  { value: "echo", label: "Pushover Echo (long)" },
  { value: "updown", label: "Up Down (long)" },
  { value: "vibrate", label: "Vibrate Only" },
  { value: "none", label: "None (silent)" },
];

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description:
    "Send a push notification. Emergency priority repeats until acknowledged and requires Retry " +
    "and Expire.",
  idempotent: false,
  params: [
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      validation: { maxLength: 1024 },
      hint: "Up to 1024 characters. Enable HTML below for `<b>`, `<i>`, `<u>`, `<a>` and `<font>`.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      validation: { maxLength: 250 },
      hint: "Defaults to your application's name.",
    },
    {
      key: "userOverride",
      label: "Send to (user or group key)",
      type: "string",
      hint: "Overrides this connection's recipient for one message. Leave empty to use the " +
        "connection's own key. Comma-separate up to 50 keys to reach several people.",
    },
    {
      key: "device",
      label: "Device",
      type: "string",
      hint:
        "Send to one named device instead of all of them. Comma-separate for several. Ignored " +
        "when sending to a group or to multiple users.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "-2", label: "Lowest — no notification at all" },
        { value: "-1", label: "Low — no sound or vibration" },
        { value: "0", label: "Normal (default)" },
        { value: "1", label: "High — bypasses the user's quiet hours" },
        { value: "2", label: "Emergency — repeats until acknowledged; needs Retry and Expire" },
      ],
    },
    {
      key: "retry",
      label: "Retry (seconds)",
      type: "number",
      validation: { integer: true, min: 30 },
      hint: "Emergency only, and required for it. How often to repeat. Minimum 30 seconds.",
    },
    {
      key: "expire",
      label: "Expire (seconds)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Emergency only, and required for it. How long to keep retrying for.",
    },
    {
      key: "sound",
      label: "Sound",
      type: "select",
      options: soundOptions,
      hint:
        "Overrides the user's own choice. A custom sound uploaded to the account that owns this " +
        "application also works — type its name.",
    },
    {
      key: "url",
      label: "Supplementary URL",
      type: "string",
      validation: { maxLength: 512 },
    },
    {
      key: "urlTitle",
      label: "URL title",
      type: "string",
      validation: { maxLength: 100 },
      hint: "Shown instead of the bare URL.",
    },
    {
      key: "html",
      label: "HTML formatting",
      type: "boolean",
      hint: "Parse the message as limited HTML rather than plain text.",
    },
    {
      key: "timestamp",
      label: "Timestamp (Unix seconds)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Display this time instead of when Pushover received the message.",
    },
    {
      key: "ttl",
      label: "Time to live (seconds)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Delete the message from the device automatically after this long.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "`1` when queued — this action throws otherwise" },
    { key: "request", type: "string", label: "Pushover's request id, for support enquiries" },
    {
      key: "receipt",
      type: "string",
      label: "Emergency messages only — poll it for acknowledgement",
    },
    { key: "limits", type: "object", label: "Monthly quota headroom, from the response headers" },
  ],

  execute(input, ctx) {
    if (input.priority === "2" && (!input.retry || !input.expire)) {
      throw new Error(
        "Emergency priority requires both Retry and Expire — Pushover repeats the notification " +
          "every Retry seconds until it is acknowledged or Expire seconds pass. Retry must be at " +
          "least 30.",
      );
    }
    if (input.priority !== "2" && (input.retry || input.expire)) {
      throw new Error(
        "Retry and Expire only apply to emergency priority (2). Set the priority, or clear them.",
      );
    }

    return new PushoverClient(ctx).request("/1/messages.json", {
      method: "POST",
      form: toForm({
        message: input.message,
        title: input.title,
        // `sign` fills `user` from the Connection when this is absent.
        user: input.userOverride,
        device: input.device,
        priority: input.priority,
        retry: input.retry,
        expire: input.expire,
        sound: input.sound,
        url: input.url,
        url_title: input.urlTitle,
        html: input.html,
        timestamp: input.timestamp,
        ttl: input.ttl,
      }),
    });
  },
};

export default messageSend;
