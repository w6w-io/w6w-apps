import type { HealthCheckDefinition } from "@w6w/types";

/**
 * No rate-limit / quota header of any kind (`X-RateLimit-*`, `RateLimit-*`,
 * or similar) was observed on live responses from
 * `business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/` or any of
 * the four Lead Generation routes this app calls, checked 2026-09-05.
 * TikTok's Marketing API documents request ceilings as prose tiers rather
 * than exposing readable headroom, the same situation several other apps in
 * this pack declare (see `HEALTHCHECKS.md`), so this is stated as a positive
 * fact rather than left as a silent gap.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "TikTok's Business API publishes no rate-limit or quota response header on any " +
      "route this app calls — checked live 2026-09-05; ceilings are documented as prose tiers " +
      "only.",
  },
};

export default quota;
