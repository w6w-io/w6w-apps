import type { ActionDefinition } from "@w6w/types";
import { MessageBirdClient } from "../lib/client.ts";
import { toMsisdn, TTS_LANGUAGE_OPTIONS, TTS_VOICE_OPTIONS } from "../lib/params.ts";

interface Input {
  recipients: string[];
  message: string;
  originator?: string;
  language?: string;
  voice?: "male" | "female";
  repeat?: number;
  ifMachine?: "continue" | "delay" | "hangup";
  machineTimeout?: number;
  reference?: string;
  scheduledDatetime?: string;
}

/**
 * Place a text-to-speech voice message call: `POST /voicemessages`. Distinct
 * from the (undocumented-here) Voice Calling / call-flow API — this is
 * MessageBird's simpler "read this text aloud" resource. Verified against
 * developers.messagebird.com/api/voice-messaging/#send.
 */
const voiceMessageSend: ActionDefinition<Input> = {
  key: "voice-message-send",
  type: "perform",
  resource: "voice",
  title: "Send Voice Message",
  description: "Call one or more recipients and read a text-to-speech message aloud.",
  idempotent: false,
  params: [
    {
      key: "recipients",
      label: "Recipients",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "+31612345678" },
      hint: "Phone numbers in E.164 format.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      validation: { maxLength: 1000 },
    },
    {
      key: "options",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "Voice, language, repeats, answering-machine handling, scheduling",
      collapsed: true,
      children: [
        {
          key: "originator",
          label: "Originator",
          type: "string",
          hint: "Caller phone number, including country code.",
        },
        {
          key: "voice",
          label: "Voice",
          type: "select",
          default: "female",
          options: TTS_VOICE_OPTIONS,
        },
        {
          key: "language",
          label: "Language",
          type: "select",
          default: "en-gb",
          options: TTS_LANGUAGE_OPTIONS,
        },
        {
          key: "repeat",
          label: "Repeat count",
          type: "number",
          default: 1,
          hint: "Number of times to repeat the message. Maximum 10.",
        },
        {
          key: "ifMachine",
          label: "If a machine answers",
          type: "select",
          default: "delay",
          options: [
            { value: "continue", label: "Continue — play the message regardless" },
            { value: "delay", label: "Delay — wait until the machine stops talking" },
            { value: "hangup", label: "Hang up" },
          ],
        },
        {
          key: "machineTimeout",
          label: "Machine-detection timeout (ms)",
          type: "number",
          default: 7000,
          hint: "400–10000ms. Used with If a machine answers.",
        },
        { key: "reference", label: "Client reference", type: "string" },
        {
          key: "scheduledDatetime",
          label: "Scheduled at",
          type: "datetime",
          hint: "Schedule the call instead of placing it immediately.",
        },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Voice message ID" },
    { key: "href", type: "string", label: "Voice message URL" },
    { key: "body", type: "string", label: "Body" },
  ],

  execute(input, ctx) {
    const client = new MessageBirdClient(ctx);
    return client.request(`/voicemessages`, {
      method: "POST",
      body: {
        recipients: input.recipients.map(toMsisdn),
        body: input.message,
        originator: input.originator,
        language: input.language,
        voice: input.voice,
        repeat: input.repeat,
        ifMachine: input.ifMachine,
        machineTimeout: input.machineTimeout,
        reference: input.reference,
        scheduledDatetime: input.scheduledDatetime,
      },
    });
  },
};

export default voiceMessageSend;
