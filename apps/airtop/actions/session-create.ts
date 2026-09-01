import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";
import { sessionOutput } from "../lib/params.ts";

/**
 * `POST /v1/sessions` — start a cloud browser session.
 *
 * Airtop bills by session-minute regardless of activity, so `timeoutMinutes`
 * (the idle timeout, NOT a hard ceiling) matters: the session terminates
 * itself after that many minutes with no incoming request, and the timer
 * resets on every HTTP/AI/WebSocket call. Defaults to 10 if left empty.
 *
 * `proxy` accepts several shapes Airtop documents as a `oneOf`
 * (`true` for Airtop's own proxy, a URL string, a
 * `{country, sticky}` config, `{url, username, password}` credentials, or an
 * array of per-domain rules) — exposed here as free-form JSON rather than
 * modeled field-by-field, since guessing a simplified subset would silently
 * drop the array/per-domain form.
 */
interface Input {
  profileName?: string;
  extensionIds?: string;
  proxy?: unknown;
  record?: boolean;
  solveCaptcha?: boolean;
  timeoutMinutes?: number;
}

const sessionCreate: ActionDefinition<Input> = {
  key: "session-create",
  type: "perform",
  resource: "session",
  title: "Create Session",
  description: "Start a new cloud browser session.",
  idempotent: false,
  params: [
    {
      key: "profileName",
      label: "Profile name",
      type: "string",
      hint: "Load a previously saved profile (cookies, local storage) into this session.",
    },
    {
      key: "extensionIds",
      label: "Extension IDs",
      type: "string",
      hint: "Comma-separated Google Web Store extension IDs to load into the session.",
    },
    {
      key: "proxy",
      label: "Proxy",
      type: "json",
      advanced: true,
      hint: "true for Airtop's own proxy, a proxy URL string, {country, sticky}, " +
        "{url, username, password}, or an array of {domainPattern, relay} rules. " +
        "Leave empty for no proxy.",
    },
    {
      key: "record",
      label: "Record session",
      type: "boolean",
      advanced: true,
    },
    {
      key: "solveCaptcha",
      label: "Auto-solve captchas",
      type: "boolean",
      advanced: true,
    },
    {
      key: "timeoutMinutes",
      label: "Idle timeout (minutes)",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 10080 },
      advanced: true,
      hint: "Session terminates after this many minutes of inactivity. Resets on every request.",
    },
  ],
  output: sessionOutput,

  execute(input, ctx) {
    ctx.log("info", "creating Airtop session", { profileName: input.profileName });
    const extensionIds = input.extensionIds
      ? input.extensionIds.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return new AirtopClient(ctx).data("/v1/sessions", {
      method: "POST",
      body: {
        configuration: {
          profileName: input.profileName || undefined,
          extensionIds,
          proxy: input.proxy,
          record: input.record,
          solveCaptcha: input.solveCaptcha,
          timeoutMinutes: input.timeoutMinutes,
        },
      },
    });
  },
};

export default sessionCreate;
