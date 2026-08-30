import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Chatwork up?
 *
 * ## No machine-readable status feed found
 *
 * Searched on 2026-08-29 for a Statuspage/Better-Stack/status.io instance and
 * for an Atom/RSS incident feed at the vendor's own hosts:
 *
 *  - `status.chatwork.com`, `chatworkstatus.com` and `info.chatwork.com` do
 *    not resolve in DNS at all.
 *  - `chatwork.statuspage.io` redirects to Statuspage's own marketing site —
 *    the unclaimed-page signature — not a live Chatwork instance.
 *  - `help.chatwork.com` (the vendor's Zendesk help center, which is where a
 *    "service status" category would plausibly live) answers 403 to a
 *    server-side client.
 *  - The developer portal's own guide pages (`/docs/getting-started`,
 *    `/docs/authentication`) carry no mention of a status page or incident
 *    feed.
 *
 * No usable source was found, so this is declared rather than guessed at —
 * `severity: "informational"` so the permanent `unknown` a declared absence
 * reports never pins this App's overall verdict there. If Chatwork publishes
 * one under a host not tried here, replace this file with a real probe.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Chatwork platform status",
  description:
    "No machine-readable status page or incident feed was found for Chatwork as of 2026-08-29 " +
    "(checked: status.chatwork.com, chatworkstatus.com and info.chatwork.com, none of which " +
    "resolve; chatwork.statuspage.io, which is an unclaimed Statuspage instance; and the " +
    "developer portal's own guide pages, which name none).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Chatwork publishes no machine-readable status page or incident feed.",
  },
};

export default service;
