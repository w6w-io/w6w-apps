import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import {
  buildHighlightInclude,
  buildRecordingInclude,
  highlightIncludeParams,
  hookOutput,
  hookTypeOptions,
  recordingIncludeParams,
} from "../lib/params.ts";

interface Input extends Record<string, unknown> {
  hookUrl: string;
  hookType: string;
}

/**
 * `POST /_/public-api/v2/hooks/create` — register a URL Grain calls when
 * `hookType` fires. Grain tests reachability at creation time: "The endpoint
 * must respond with a 2xx status in order to successfully create the hook."
 *
 * `include` only applies to four of the ten hook types, and takes a
 * different shape for each pair:
 *
 *   - `recording_added` / `recording_updated` — Recording Include (the same
 *     object `List Recordings` / `Get Recording` take).
 *   - `highlight_added` / `highlight_updated` — Highlight Include
 *     (`transcript`, `speakers`).
 *   - every other type — Grain documents `include` as "N/A" for these; the
 *     params below are simply ignored by `execute` when they don't apply.
 *
 * This action exposes both Recording Include and Highlight Include params
 * unconditionally rather than switching the form on `hookType` (the param
 * contract has no showIf tied to a sibling select's value modelled here),
 * and only sends the one matching object Grain actually documents for the
 * chosen type.
 */
const hookCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "hook-create",
  type: "perform",
  resource: "hook",
  title: "Create Hook",
  description:
    "Register a URL to receive Grain's recording/highlight/story/upload-status events. Grain " +
    "verifies the URL answers 2xx before the hook is created.",
  // Replaying this registers a second hook against the same URL/type; Grain
  // publishes no idempotency key and no upsert form.
  idempotent: false,
  params: [
    {
      key: "hookUrl",
      label: "Hook URL",
      type: "string",
      required: true,
      hint: "Endpoint Grain calls when the event fires. Must answer 2xx or hook creation fails.",
      placeholder: "https://example.com/hook",
    },
    {
      key: "hookType",
      label: "Hook Type",
      type: "select",
      required: true,
      options: hookTypeOptions,
    },
    ...recordingIncludeParams,
    ...highlightIncludeParams,
  ],
  output: hookOutput,

  async execute(input, ctx) {
    const body: Record<string, unknown> = {
      hook_url: input.hookUrl,
      hook_type: input.hookType,
    };

    if (input.hookType === "recording_added" || input.hookType === "recording_updated") {
      const include = buildRecordingInclude(input);
      if (include) body.include = include;
    } else if (input.hookType === "highlight_added" || input.hookType === "highlight_updated") {
      const include = buildHighlightInclude(input);
      if (include) body.include = include;
    }

    const result = await new GrainClient(ctx).request<Record<string, unknown>>(
      "/v2/hooks/create",
      { method: "POST", body },
    );
    return result ?? {};
  },
};

export default hookCreate;
