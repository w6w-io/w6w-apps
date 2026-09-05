import type { ActionDefinition } from "@w6w/types";
import { JudgeMeClient } from "../lib/client.ts";

/**
 * `PUT /reviews/{id}` — Update (publish or hide).
 *
 * The document's own key for this operation is malformed —
 * `'reviews/{id}':` with no leading slash — sitting right next to the
 * correctly-slashed `'/reviews/{id}':` used by the Get operation a few lines
 * later. This action uses the correct, slashed form, which matches every
 * other `{id}`-suffixed path in the document.
 *
 * Judge.me does not support editing review content via the API "for
 * authenticity reasons" — the only mutation exposed here is `curated`
 * (`ok` publishes, `spam` hides).
 */
interface Input {
  id: number;
  curated: "ok" | "spam";
}

const updateReview: ActionDefinition<Input> = {
  key: "update-review",
  type: "perform",
  resource: "review",
  title: "Publish or Hide Review",
  description:
    "Publish (curated=ok) or hide (curated=spam) a review. Judge.me does not support editing " +
    "review content via the API.",
  idempotent: true,
  params: [
    { key: "id", label: "Review ID", type: "number", required: true },
    {
      key: "curated",
      label: "Curated Status",
      type: "select",
      required: true,
      options: [
        { value: "ok", label: "Publish (ok)" },
        { value: "spam", label: "Hide (spam)" },
      ],
    },
  ],
  output: [
    { key: "message", type: "string", label: "Confirmation message" },
  ],

  async execute(input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{ message?: string }>(
      `/reviews/${encodeURIComponent(String(input.id))}`,
      { method: "PUT", body: { curated: input.curated } },
    );
    return { message: body?.message };
  },
};

export default updateReview;
