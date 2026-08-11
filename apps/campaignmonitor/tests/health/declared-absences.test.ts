import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

/**
 * Both of this app's declared absences, checked as absences rather than as
 * prose.
 *
 * The `informational` severity is the load-bearing part: an `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at
 * any other severity these two declarations would pin the App's verdict at
 * `unknown` forever.
 */
const ABSENCES = [
  { name: "service", check: service },
  { name: "quota", check: quota },
];

Deno.test("health: every declared absence has a reason, no hook, and informational severity", () => {
  for (const { name, check } of ABSENCES) {
    assertEquals(check.check, undefined, `${name}: an unavailable check must have no hook`);
    assert(
      typeof check.unavailable?.reason === "string" && check.unavailable.reason.length > 0,
      `${name}: no reason`,
    );
    assertEquals(
      check.severity,
      "informational",
      `${name}: an unavailable check at any other severity pins the App at unknown forever`,
    );
  }
  assertEquals(ABSENCES.length, 2);
});

/**
 * The distinction this app is careful about: Campaign Monitor's status page
 * EXISTS and is machine-readable — it is unreachable to a server-side client,
 * which is a different fact from "no status page". The reason has to say so,
 * and has to name the alternatives that were ruled out, or the next person
 * re-does the whole investigation.
 */
Deno.test("health/service: the reason records that the page exists and why it is unusable", () => {
  const reason = service.unavailable!.reason;
  // What is there.
  assert(reason.includes("status.campaignmonitor.com"), "names the host");
  assert(reason.includes("summary.json"), "names the machine-readable endpoint");
  assert(reason.includes("StatusCast"), "names the platform");
  // That it covers the API, which a status page does not automatically do.
  assert(reason.includes("API endpoints"), "records that an API component exists");
  // Why it cannot be used, with the measurement.
  assert(reason.includes("403"), "names the status the WAF returns");
  assert(reason.includes("User-Agent"), "names the discriminator");
  assert(reason.includes("Deno"), "names the runtime whose default UA is blocked");
  assert(reason.includes("2026-08-11"), "dates the measurement");
  // The alternatives that were ruled out, so nobody re-derives them.
  for (
    const alternative of [
      "/history.atom",
      "campaignmonitor.statuspage.io",
      "status.createsend.com",
      "trust.campaignmonitor.com",
    ]
  ) {
    assert(reason.includes(alternative), `does not record ruling out ${alternative}`);
  }
  // And where the question is answered instead.
  assert(reason.includes("`api` check"), "points at the reachability probe that replaces it");
});

/**
 * The quota absence is not "the vendor publishes nothing" — Campaign Monitor
 * publishes a complete X-RateLimit triple. The reason has to record that the
 * headers exist and why reading them is not side-effect-free, otherwise the
 * next person adds a probe that sends email.
 */
Deno.test("health/quota: the reason records that the rate-limit headers exist but cannot be read", () => {
  const reason = quota.unavailable!.reason;
  assert(reason.includes("X-RateLimit-Limit"), "names the header that does exist");
  assert(reason.includes("/transactional"), "names the only endpoints that carry it");
  assert(reason.includes("sends email"), "says why reading it is not side-effect-free");
  assert(reason.includes("980"), "names the code a non-transactional account gets");
  // And the near-miss alternative, with the reason it is not headroom.
  assert(reason.includes("billingdetails"), "names the credits endpoint");
  assert(reason.includes("no ceiling"), "says why a credit balance is not headroom");
  assert(reason.includes("billing-details-get"), "points at where the number is still available");
});

Deno.test("health: neither absence declares egress or a feed it cannot fetch", () => {
  for (const { name, check } of ABSENCES) {
    assertEquals(check.network, undefined, `${name}: an unavailable check reaches nothing`);
    assertEquals(check.feed, undefined, `${name}: an unavailable check parses nothing`);
  }
});
