import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `POST /v1.0/gammas/{gammaId}/export` — verified against
 * `management/export-gamma.md`. Starts a new export job every call — there is
 * no idempotency key documented — so `idempotent: false`. Poll Get Export
 * Status with the returned exportId.
 */
interface Input {
  gammaId: string;
  exportAs: string;
}

const exportGamma: ActionDefinition<Input> = {
  key: "export-gamma",
  type: "perform",
  resource: "gamma",
  title: "Export Gamma",
  description:
    "Start an asynchronous export of an existing Gamma to PDF, PPTX, or PNG. Accepts a gamma " +
    "(file) ID or a page/doc ID.",
  idempotent: false,
  params: [
    { key: "gammaId", label: "Gamma or Doc ID", type: "string", required: true },
    {
      key: "exportAs",
      label: "Export As",
      type: "select",
      required: true,
      options: [
        { value: "pdf", label: "PDF" },
        { value: "pptx", label: "PPTX" },
        { value: "png", label: "PNG (zip of card images)" },
      ],
    },
  ],
  output: [
    { key: "exportId", type: "string", label: "Export Job ID" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(`/gammas/${encodeURIComponent(input.gammaId)}/export`, {
      method: "POST",
      body: { exportAs: input.exportAs },
    });
  },
};

export default exportGamma;
