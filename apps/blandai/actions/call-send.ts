import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BlandClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/calls` — dispatch an AI phone call.
 *
 * Verified against `docs.bland.ai/api-v1/post/calls`. The full documented body
 * is very large (model, dispatch, knowledge, audio, analysis, post-call and
 * advanced parameter groups) — this action covers the fields most workflows
 * need to start and shape a call. Deliberately left out for v1, and
 * confirmed real rather than guessed away: `tools` (custom-tool objects,
 * `dynamic_data`, `guard_rails`, `dispositions`, `retry`, `citation_schema_ids`,
 * `pronunciation_guide`, `transfer_list`, `dialing_strategy`,
 * `precall_dtmf_sequence`, and the voicemail/post-call-eval sub-objects — see
 * `README.md`.
 *
 * Response is the flat `{"status", "message", "call_id", "batch_id"}` shape
 * (not the `{data, errors}` envelope), verified in the doc's own example.
 */
interface Input {
  phoneNumber: string;
  task?: string;
  pathwayId?: string;
  pathwayVersion?: number;
  voice?: string;
  firstSentence?: string;
  personaId?: string;
  model?: string;
  language?: string;
  waitForGreeting?: boolean;
  temperature?: number;
  from?: string;
  timezone?: string;
  maxDuration?: number;
  transferPhoneNumber?: string;
  record?: boolean;
  webhook?: string;
  summaryPrompt?: string;
  metadata?: unknown;
  requestData?: unknown;
}

const callSend: ActionDefinition<Input> = {
  key: "call-send",
  type: "perform",
  resource: "call",
  title: "Send Call",
  description: "Dispatch an AI phone call with a task prompt or a conversational pathway.",
  // Every call dispatches a real phone call and bills the account; retrying a
  // dropped response would place a second call to the same number.
  idempotent: false,
  params: [
    {
      key: "phoneNumber",
      label: "Phone Number",
      type: "string",
      required: true,
      hint: "E.164 format, e.g. +12223334444.",
    },
    {
      key: "task",
      label: "Task",
      type: "text",
      hint: "The agent's instructions/persona for this call. Required unless pathwayId is set.",
    },
    { key: "pathwayId", label: "Pathway ID", type: "string" },
    { key: "pathwayVersion", label: "Pathway Version", type: "number" },
    {
      key: "voice",
      label: "Voice",
      type: "string",
      hint: "A voice name (e.g. maya) or voice ID — curated, cloned, or library.",
    },
    { key: "firstSentence", label: "First Sentence", type: "string" },
    { key: "personaId", label: "Persona ID", type: "string" },
    {
      key: "model",
      label: "Model",
      type: "select",
      default: "base",
      options: [
        { label: "base", value: "base" },
        { label: "turbo", value: "turbo" },
      ],
    },
    { key: "language", label: "Language", type: "string", default: "babel-en" },
    { key: "waitForGreeting", label: "Wait For Greeting", type: "boolean", default: false },
    { key: "temperature", label: "Temperature", type: "number", default: 0.7 },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "Number to dispatch from, if configurable.",
    },
    { key: "timezone", label: "Timezone", type: "string", default: "America/Los_Angeles" },
    { key: "maxDuration", label: "Max Duration (minutes)", type: "number", default: 30 },
    { key: "transferPhoneNumber", label: "Transfer Phone Number", type: "string" },
    { key: "record", label: "Record", type: "boolean", default: false },
    { key: "webhook", label: "Post-Call Webhook URL", type: "string" },
    { key: "summaryPrompt", label: "Summary Prompt", type: "string" },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Arbitrary JSON echoed back on the call record.",
    },
    { key: "requestData", label: "Request Data", type: "json" },
  ],
  output: [
    { key: "status", type: "string", label: "success or error" },
    { key: "message", type: "string", label: "Status message" },
    { key: "callId", type: "string", label: "Call ID" },
    { key: "batchId", type: "string", label: "Batch ID, if part of a batch" },
  ],

  async execute(input, ctx) {
    const body = compact({
      phone_number: input.phoneNumber,
      task: input.task,
      pathway_id: input.pathwayId,
      pathway_version: input.pathwayVersion,
      voice: input.voice,
      first_sentence: input.firstSentence,
      persona_id: input.personaId,
      model: input.model,
      language: input.language,
      wait_for_greeting: input.waitForGreeting,
      temperature: input.temperature,
      from: input.from,
      timezone: input.timezone,
      max_duration: input.maxDuration,
      transfer_phone_number: input.transferPhoneNumber,
      record: input.record,
      webhook: input.webhook,
      summary_prompt: input.summaryPrompt,
      metadata: asOptionalJson<Record<string, unknown>>(input.metadata, "metadata"),
      request_data: asOptionalJson<Record<string, unknown>>(input.requestData, "requestData"),
    });

    const res = await new BlandClient(ctx).request<{
      status: string;
      message?: string;
      call_id?: string;
      batch_id?: string | null;
    }>("/v1/calls", { method: "POST", body });

    return {
      status: res.status,
      message: res.message,
      callId: res.call_id,
      batchId: res.batch_id ?? undefined,
    };
  },
};

export default callSend;
