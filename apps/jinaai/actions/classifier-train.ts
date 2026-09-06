import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  classifierId?: string;
  model?: string;
  input: unknown;
  access?: string;
  numIters?: number;
}

/**
 * POST /v1/train — creates a new few-shot classifier, or adds more labeled
 * examples to an existing one, depending on which fields are set:
 *
 * - **Create**: `model` + `input` (an array of `{text, label}` or
 *   `{image, label}` items) + optional `access`/`num_iters`.
 * - **Update**: `classifier_id` + `input` — adds examples to a classifier
 *   already trained by a prior call. `model`/`access`/`num_iters` don't apply
 *   once a classifier exists.
 *
 * The response's `classifier_id` (new on create, echoed on update) is what
 * `classify` and `classifier-delete` reference afterward.
 */
const classifierTrain: ActionDefinition<Input> = {
  key: "classifier-train",
  type: "perform",
  resource: "classifier",
  idempotent: false,
  title: "Train Classifier",
  description:
    "Create a few-shot classifier from labeled examples, or add more to an existing one.",
  params: [
    {
      key: "classifierId",
      label: "Classifier ID",
      type: "string",
      hint: "Set to add examples to an existing classifier. Leave empty to create a new one.",
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      hint:
        "Required when creating a new classifier (classifierId empty). e.g. jina-embeddings-v3, " +
        "jina-clip-v2 (for image examples).",
    },
    {
      key: "input",
      label: "Training examples",
      type: "json",
      required: true,
      hint:
        'Array of `{"text": "...", "label": "..."}` or `{"image": "...", "label": "..."}` items.',
    },
    {
      key: "access",
      label: "Access",
      type: "select",
      options: [
        { label: "Public", value: "public" },
        { label: "Private", value: "private" },
      ],
      default: "public",
      hint: "Create form only.",
    },
    {
      key: "numIters",
      label: "Training iterations",
      type: "number",
      default: 10,
      hint: "Create form only.",
    },
  ],
  output: [
    { key: "classifier_id", type: "string", label: "Classifier ID" },
    { key: "num_samples", type: "number", label: "Samples processed by this call" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const client = new JinaClient(ctx);
    const body: Record<string, unknown> = { input: input.input };
    if (input.classifierId) {
      body.classifier_id = input.classifierId;
    } else {
      if (!input.model) {
        throw new Error("classifier-train: `model` is required when classifierId is empty");
      }
      body.model = input.model;
      if (input.access !== undefined) body.access = input.access;
      if (input.numIters !== undefined) body.num_iters = input.numIters;
    }
    return client.request("/v1/train", { method: "POST", body });
  },
};

export default classifierTrain;
