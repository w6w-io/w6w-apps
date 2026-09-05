import type { HealthCheckDefinition } from "@w6w/types";

/**
 * SimplyBook.me exposes no request-rate headroom to read.
 *
 * Verified 2026-09-05 against the fetched OpenAPI documents (both
 * `swagger-admin` and `swagger-public`): zero mentions of `rate`, `limit`,
 * `quota`, `429`, or an `X-RateLimit-*`/`RateLimit-*` response header
 * anywhere in either 200+KB document, and no endpoint returns one on a live
 * probe either.
 *
 * `GET /admin/tariff/current` (`CompanyTariffEntity`) looked like the
 * candidate — it is literally named "tariff" — but it only carries the
 * subscription plan's name and expiry (`subscription_name`, `expire_date`,
 * `is_expired`, `expire_in`), never a request budget. Oddly, a
 * `CompanyTariff_LimitEntity` schema (`key`/`total`/`rest`) exists in the
 * document's `components/schemas` but is never referenced by any path or
 * embedded in `CompanyTariffEntity` itself — an orphan schema, not a wired
 * field, so there is nothing this check could read even by guessing a nested
 * path.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "SimplyBook.me's OpenAPI documents (admin and public) name no rate-limit response " +
      "header and no headroom endpoint. GET /admin/tariff/current reports subscription plan " +
      "expiry, not a request budget — the CompanyTariff_LimitEntity schema exists but is never " +
      "referenced by any path, so no request quota is readable even indirectly.",
  },
};

export default quota;
