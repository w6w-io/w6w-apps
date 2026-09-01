import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  aiOutput,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

const formatOptions = [
  { value: "base64", label: "Base64 — inline image data (default for viewport)" },
  { value: "url", label: "URL — signed download URL (default for other scopes)" },
];

/**
 * `POST /v1/sessions/{sessionId}/windows/{windowId}/screenshot`
 *
 * The image itself does NOT come back as `data.modelResponse` — like every AI
 * interaction that shape carries a text answer, and a screenshot isn't text.
 * It comes back in `meta.screenshots[0]`, as `dataUrl` (base64) or
 * `signedDownloadUrl` depending on `format`.
 */
interface Input {
  sessionId: string;
  windowId: string;
  format?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowScreenshot: ActionDefinition<Input> = {
  key: "window-screenshot",
  type: "read",
  resource: "window-interaction",
  title: "Screenshot",
  description: "Capture a screenshot of the window's current viewport.",
  params: [
    sessionIdParam,
    windowIdParam,
    { key: "format", label: "Format", type: "select", options: formatOptions },
    {
      key: "maxWidth",
      label: "Max width (px)",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "maxHeight",
      label: "Max height (px)",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "quality",
      label: "JPEG quality",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      advanced: true,
      hint: "1-100. The vendor notes this option is still in development.",
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(
    { key: "dataUrl", type: "string", label: "Base64 data URL" },
    { key: "signedDownloadUrl", type: "string", label: "Signed download URL" },
    { key: "screenshotFormat", type: "string", label: "Screenshot format" },
  ),

  async execute(input, ctx) {
    const config = compact({
      format: input.format,
      maxWidth: input.maxWidth,
      maxHeight: input.maxHeight,
      quality: input.quality,
    });
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/screenshot`,
      {
        method: "POST",
        body: {
          configuration: Object.keys(config).length ? { screenshot: config } : undefined,
          ...aiInteractionBody(input),
        },
      },
    );
    const shot = result.meta.screenshots?.[0];
    return {
      modelResponse: result.modelResponse,
      status: result.meta.status,
      credits: result.meta.usage?.credits,
      requestId: result.meta.requestId,
      dataUrl: shot?.dataUrl,
      signedDownloadUrl: shot?.signedDownloadUrl,
      screenshotFormat: shot?.format,
    };
  },
};

export default windowScreenshot;
