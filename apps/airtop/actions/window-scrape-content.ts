import type { ActionDefinition } from "@w6w/types";
import type { AiResponseMeta } from "../lib/client.ts";
import { AirtopClient } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

/**
 * `POST /v1/sessions/{sessionId}/windows/{windowId}/scrape-content`
 *
 * Unlike every other AI window interaction, this one's `data.modelResponse`
 * is a STRUCTURED object (`{scrapedContent: {text, contentType}, title,
 * selectedText}`), not a string — so it is read directly here rather than
 * through {@link AirtopClient.aiRequest}, which assumes a text answer.
 */
interface Input {
  sessionId: string;
  windowId: string;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

interface ScrapeData {
  modelResponse: {
    scrapedContent: { text: string; contentType: string };
    title: string;
    selectedText?: string;
  };
}

const windowScrapeContent: ActionDefinition<Input> = {
  key: "window-scrape-content",
  type: "read",
  resource: "window-interaction",
  title: "Scrape Content",
  description: "Read the page's content verbatim, as text.",
  params: [sessionIdParam, windowIdParam, ...aiInteractionParams()],
  output: [
    { key: "text", type: "string", label: "Page text" },
    { key: "contentType", type: "string", label: "Content type" },
    { key: "title", type: "string", label: "Page title" },
    { key: "selectedText", type: "string", label: "Highlighted text" },
    { key: "status", type: "string", label: "Outcome (success / partial / failure)" },
    { key: "credits", type: "number", label: "Credits used" },
    { key: "requestId", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const envelope = await new AirtopClient(ctx).envelope<ScrapeData["modelResponse"]>(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/scrape-content`,
      { method: "POST", body: aiInteractionBody(input) },
    );
    // The endpoint's response nests the same way as every AI interaction:
    // `data.modelResponse` — here an object, not a string.
    const modelResponse =
      (envelope.data as unknown as { modelResponse?: ScrapeData["modelResponse"] })?.modelResponse;
    const meta = envelope.meta as AiResponseMeta | undefined;
    return {
      text: modelResponse?.scrapedContent?.text,
      contentType: modelResponse?.scrapedContent?.contentType,
      title: modelResponse?.title,
      selectedText: modelResponse?.selectedText,
      status: meta?.status,
      credits: meta?.usage?.credits,
      requestId: meta?.requestId,
    };
  },
};

export default windowScrapeContent;
