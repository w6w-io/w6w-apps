import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  aiOutput,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

const interactionModeOptions = [
  { value: "auto", label: "Auto — most cost-effective (default)" },
  { value: "accurate", label: "Accurate — slower, more reliable" },
  { value: "cost-efficient", label: "Cost-efficient — cheaper, faster, less accurate" },
];

const paginationModeOptions = [
  { value: "auto", label: "Auto — pagination links, then infinite scroll (default)" },
  { value: "paginated", label: "Paginated — follow pagination links" },
  { value: "infinite-scroll", label: "Infinite scroll" },
];

/**
 * `POST /v1/sessions/{sessionId}/windows/{windowId}/paginated-extraction`
 *
 * Extract data across multiple pages of results in one call — the prompt
 * should state how many pages/results to consider, since without a stated
 * limit this can be expensive.
 */
interface Input {
  sessionId: string;
  windowId: string;
  prompt: string;
  interactionMode?: string;
  paginationMode?: string;
  outputSchema?: string;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowPaginatedExtraction: ActionDefinition<Input> = {
  key: "window-paginated-extraction",
  type: "read",
  resource: "window-interaction",
  title: "Paginated Extraction",
  description: "Extract data across multiple pages of results in one call.",
  params: [
    sessionIdParam,
    windowIdParam,
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      required: true,
      hint: "Describe the list and what to extract, and constrain how many pages/results to " +
        "consider — e.g. 'Navigate through 3 pages of results and return the title and price of " +
        "each product.'",
    },
    {
      key: "interactionMode",
      label: "Interaction mode",
      type: "select",
      options: interactionModeOptions,
      advanced: true,
    },
    {
      key: "paginationMode",
      label: "Pagination mode",
      type: "select",
      options: paginationModeOptions,
      advanced: true,
    },
    {
      key: "outputSchema",
      label: "Output schema (JSON Schema, as text)",
      type: "code",
      advanced: true,
      hint: "A JSON Schema document, as a string. Without it, the response shape may vary.",
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(),

  async execute(input, ctx) {
    const config = compact({
      interactionMode: input.interactionMode,
      paginationMode: input.paginationMode,
      outputSchema: input.outputSchema,
    });
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/paginated-extraction`,
      {
        method: "POST",
        body: {
          prompt: input.prompt,
          configuration: Object.keys(config).length ? config : undefined,
          ...aiInteractionBody(input),
        },
      },
    );
    return {
      modelResponse: result.modelResponse,
      status: result.meta.status,
      credits: result.meta.usage?.credits,
      requestId: result.meta.requestId,
    };
  },
};

export default windowPaginatedExtraction;
