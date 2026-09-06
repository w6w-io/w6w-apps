import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  classifierId?: string;
  model?: string;
  labels?: unknown;
  input: unknown;
}

/**
 * POST /v1/classify — the vendor's own schema is `anyOf` two entirely different
 * request shapes selected by WHICH fields are present, not by a discriminator
 * field:
 *
 * - **Zero-shot**: `model` + `labels` (an array, or an object mapping a label
 *   to few-shot example strings) + `input`. No classifier is created or
 *   persisted.
 * - **Few-shot**: `classifier_id` + `input` only, against a classifier
 *   trained ahead of time (see `classifier-train`).
 *
 * This action exposes both through one form rather than splitting them,
 * because they answer the same question ("what class is this?") and differ
 * only in whether a reusable classifier is named — set `classifierId` for the
 * few-shot form, or `model` + `labels` for zero-shot.
 */
const classify: ActionDefinition<Input> = {
  key: "classify",
  type: "perform",
  resource: "classification",
  idempotent: true,
  title: "Classify",
  description: "Zero-shot classify text/images against ad-hoc labels, or run a trained classifier.",
  params: [
    {
      key: "classifierId",
      label: "Classifier ID",
      type: "string",
      hint: "Few-shot form: the ID of a classifier trained via classifier-train. Leave empty for " +
        "zero-shot classification.",
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      hint: "Zero-shot form, required if classifierId is empty. e.g. jina-embeddings-v3, " +
        "jina-embeddings-v4, jina-clip-v2 (for image input), jina-code-embeddings-1.5b.",
    },
    {
      key: "labels",
      label: "Labels",
      type: "json",
      hint: "Zero-shot form, required if classifierId is empty. An array of label strings, or " +
        '`{"label": ["example 1", "example 2"]}` to give few-shot examples per label.',
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      hint: 'A string, `{"text": "..."}` / `{"image": "..."}`, or an array of these.',
    },
  ],
  output: [
    { key: "data", type: "array", label: "One prediction per input item" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const client = new JinaClient(ctx);
    const body: Record<string, unknown> = { input: input.input };
    if (input.classifierId) {
      body.classifier_id = input.classifierId;
    } else {
      if (!input.model) throw new Error("classify: `model` is required when classifierId is empty");
      if (input.labels === undefined) {
        throw new Error("classify: `labels` is required when classifierId is empty");
      }
      body.model = input.model;
      body.labels = input.labels;
    }
    return client.request("/v1/classify", { method: "POST", body });
  },
};

export default classify;
