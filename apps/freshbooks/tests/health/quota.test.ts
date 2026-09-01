import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";

/**
 * `quota` is a declared ABSENCE, not a probe. FreshBooks publishes no
 * rate-limit headers and no numeric daily request ceiling (freshbooks.com/api/limits
 * says only that short bursts "will be rate-limited"). The RFC makes
 * `unavailable` a first-class answer for exactly this, and a better one than
 * a silent gap or an invented always-`ok` check.
 */
Deno.test("quota: declares an absence rather than inventing a probe", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.covers, ["*"]);
  assertEquals(quota.check, undefined, "an unavailable entry must have no hook");
  assert(quota.unavailable, "must declare why no check exists");
  assert(
    (quota.unavailable!.reason ?? "").length > 40,
    "the reason must actually explain, not just assert",
  );
});

Deno.test("quota: is informational, or its permanent unknown would pin the verdict", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: declares no egress, because it makes no request", () => {
  assertEquals(quota.network, undefined);
  assertEquals(quota.feed, undefined, "feed and unavailable are mutually exclusive");
});
