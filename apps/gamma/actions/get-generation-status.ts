import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/generations/{id}` — poll until `status` is `completed` or
 * `failed`. Verified against `generations/get-generation-status.md`.
 *
 * `exportUrl` is a bearer-style link: "anyone with this URL can download the
 * file until it expires (about one week) — access is not tied to your API
 * key." This action returns it unchanged (it is the documented result), but a
 * workflow author should treat it as a secret in whatever it does next.
 */
interface Input {
  generationId: string;
}

const getGenerationStatus: ActionDefinition<Input> = {
  key: "get-generation-status",
  type: "read",
  resource: "generation",
  title: "Get Generation Status",
  description:
    "Poll a generation job. Returns gammaUrl, exportUrl and credits once status is completed, " +
    "or an error object once failed.",
  params: [
    { key: "generationId", label: "Generation ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "pending | completed | failed" },
    { key: "gammaId", type: "string", label: "Gamma (file) ID — when completed" },
    { key: "gammaUrl", type: "string", label: "Gamma URL — when completed" },
    { key: "exportUrl", type: "string", label: "Export download URL — when exportAs was set" },
    { key: "credits", type: "object", label: "{ deducted, remaining } — when completed" },
    { key: "error", type: "object", label: "{ message, statusCode } — when failed" },
    { key: "pages", type: "array", label: "Per-page results — multi-page generations only" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(
      `/generations/${encodeURIComponent(input.generationId)}`,
    );
  },
};

export default getGenerationStatus;
