import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient } from "../lib/client.ts";

/**
 * `GET /v1/models` — the model catalogue for this account.
 *
 * ## The response is a bare array
 *
 * Unlike every other list in this app, this endpoint's `200` schema is
 * `{"type": "array", "items": ModelResponseModel}` — no `{voices: […]}` or
 * `{history: […]}` envelope. Code that reaches for `.models` gets `undefined`,
 * which is why this action returns the array under an explicit `models` key
 * rather than passing the raw body through: a workflow step's output has to be
 * an object.
 *
 * ## What to read off it
 *
 * `can_do_text_to_speech` says whether a model id is legal in the Text to Speech
 * actions, and `maximum_text_length_per_request` is the cap that a long input
 * will otherwise hit as a validation error. `concurrency_group` is the bucket
 * the plan's concurrency limit applies to, and `token_cost_factor` is what makes
 * one model cheaper per character than another.
 *
 * ## An account-shaped 404
 *
 * Called with no credential at all this endpoint answers `404`
 * `workspace_not_found` rather than `401` (measured 2026-08-11) — which is one
 * reason it is not the credential probe: a missing credential and a missing
 * workspace are indistinguishable from the status alone.
 */
const modelList: ActionDefinition<Record<string, never>> = {
  key: "model-list",
  type: "read",
  resource: "model",
  title: "List Models",
  description:
    "List the models available to this account, with their capabilities, limits and cost factors.",
  params: [],
  output: [{ key: "models", type: "array", label: "The models, as returned by the API" }],

  async execute(_input, ctx) {
    const models = await new ElevenLabsClient(ctx).json<unknown[]>("/v1/models");
    return { models: models ?? [] };
  },
};

export default modelList;
