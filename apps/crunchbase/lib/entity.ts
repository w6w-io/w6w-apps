import type { Param } from "@w6w/types";
import { csv } from "./client.ts";

/**
 * Shared params for a `/data/entities/{collection}/{entity_id}` lookup.
 * `entity_id` accepts either the UUID or the permalink (Crunchbase's own
 * example: `GET /data/entities/organizations/tesla-motors`); `field_ids` and
 * `card_ids` are both optional, comma-separated (`style: form, explode:
 * false` in the OpenAPI parameter definitions) — omitting `field_ids` gets
 * Crunchbase's own default field set for the collection.
 *
 * A `card_id` (a named relationship, e.g. `founders`) returns **at most 100
 * items** (`docs/using-entity-lookup-apis`); more requires the dedicated
 * per-card lookup endpoint (`/entities/{collection}/{entity_id}/cards/{card_id}`),
 * which is out of scope here.
 */
export function entityParams(fieldIdsHint: string, cardIdsHint: string): Param[] {
  return [
    {
      key: "entityId",
      label: "Entity ID",
      type: "string",
      required: true,
      hint: 'UUID or permalink (e.g. "tesla-motors").',
    },
    {
      key: "fieldIds",
      label: "Fields To Return",
      type: "string",
      default: "",
      hint: `Comma-separated field_ids. Leave blank for Crunchbase's default set. ${fieldIdsHint}`,
    },
    {
      key: "cardIds",
      label: "Cards To Include",
      type: "string",
      default: "",
      hint:
        `Comma-separated card_ids (relationships). A card returns at most 100 items. ${cardIdsHint}`,
    },
  ];
}

export function entityQuery(
  input: Record<string, unknown>,
): { field_ids?: string; card_ids?: string } {
  const field_ids = csv(input.fieldIds);
  const card_ids = csv(input.cardIds);
  const query: { field_ids?: string; card_ids?: string } = {};
  if (field_ids) query.field_ids = field_ids.join(",");
  if (card_ids) query.card_ids = card_ids.join(",");
  return query;
}
