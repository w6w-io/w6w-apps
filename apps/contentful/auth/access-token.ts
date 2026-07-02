import type { AuthDefinition } from "@w6w/types";
import { API_HOSTS } from "../lib/client.ts";

/**
 * Access token (`bearer`) — Contentful ships three token flavors that all sign
 * requests the same way (Authorization: Bearer <token>), so a single bearer
 * method fits them all. The user picks which one to paste:
 *
 *   - Content Delivery API token → read published content from `cdn.`.
 *   - Content Preview API token  → read drafts from `preview.`.
 *   - Content Management API token → full CRUD via `api.`.
 *
 * The action decides which host it hits; auth just supplies the token. We also
 * capture `spaceId` and `environmentId` here — n8n stored these on the
 * credential too, and every request needs them in the path.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Content Delivery, Preview, or Management API token. Paired with your Space ID and Environment ID.",
  connectionLabel: "{{space.name}} ({{space.id}})",
  fields: [
    {
      key: "apiKey",
      label: "API Token",
      type: "secret",
      required: true,
      hint:
        "Contentful → Settings → API keys. Use a Delivery, Preview, or Management token depending on which operations you need.",
    },
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      required: true,
      hint: "Contentful → Settings → General settings → Space ID.",
    },
    {
      key: "environmentId",
      label: "Environment ID",
      type: "string",
      default: "master",
      hint: "Defaults to `master` if your plan has no environments.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey, spaceId } = credential as { apiKey: string; spaceId: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!spaceId) return { ok: false, message: "credential missing spaceId" };
    const res = await ctx.fetch(`${API_HOSTS.delivery}/spaces/${spaceId}`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Contentful returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(input, ctx) {
    const cred = (input as { credential?: { spaceId?: string; environmentId?: string } })
      .credential;
    const spaceId = cred?.spaceId;
    const environmentId = cred?.environmentId ?? "master";
    if (!spaceId) return {};
    const res = await ctx.fetch(`${API_HOSTS.delivery}/spaces/${spaceId}`);
    if (!res.ok) return { space: { id: spaceId }, environment: { id: environmentId } };
    const space = await res.json() as { sys?: { id?: string }; name?: string };
    return {
      space: {
        id: space.sys?.id ?? spaceId,
        name: space.name ?? spaceId,
      },
      environment: { id: environmentId },
    };
  },
};

export default accessToken;
