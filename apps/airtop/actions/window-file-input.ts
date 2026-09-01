import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import {
  aiInteractionBody,
  aiInteractionParams,
  aiOutput,
  sessionIdParam,
  windowIdParam,
} from "../lib/params.ts";

/**
 * `POST /v1/sessions/{sessionId}/windows/{windowId}/file-input`
 *
 * Attach a file already uploaded via the Files API (see `file-list`/`file-get`)
 * to a file input element on the page. One of `fileId` or `fileName` is
 * required (the vendor's own prose says so; the schema does not enforce it).
 */
interface Input {
  sessionId: string;
  windowId: string;
  fileId?: string;
  fileName?: string;
  elementDescription?: string;
  includeHiddenElements?: boolean;
  costThresholdCredits?: number;
  timeThresholdSeconds?: number;
  clientRequestId?: string;
}

const windowFileInput: ActionDefinition<Input> = {
  key: "window-file-input",
  type: "perform",
  resource: "window-interaction",
  title: "File Input",
  description: "Attach a previously uploaded file to a file input element on the page.",
  idempotent: false,
  params: [
    sessionIdParam,
    windowIdParam,
    {
      key: "fileId",
      label: "File ID",
      type: "string",
      hint: "One of File ID or File name is required. Take the ID from Create File / List Files.",
    },
    { key: "fileName", label: "File name", type: "string" },
    {
      key: "elementDescription",
      label: "Element description",
      type: "string",
      hint: "Natural language, e.g. 'the file input in the bottom left corner'.",
    },
    {
      key: "includeHiddenElements",
      label: "Include hidden file inputs",
      type: "boolean",
      default: true,
      advanced: true,
    },
    ...aiInteractionParams(),
  ],
  output: aiOutput(),

  async execute(input, ctx) {
    if (!input.fileId && !input.fileName) {
      throw new Error("window-file-input requires fileId or fileName");
    }
    const result = await new AirtopClient(ctx).aiRequest(
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/windows/${
        encodeURIComponent(input.windowId)
      }/file-input`,
      {
        method: "POST",
        body: {
          fileId: input.fileId,
          fileName: input.fileName,
          elementDescription: input.elementDescription,
          includeHiddenElements: input.includeHiddenElements,
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

export default windowFileInput;
