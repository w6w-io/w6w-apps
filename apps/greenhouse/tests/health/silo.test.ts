import { assert, assertEquals } from "@std/assert";
import silo from "../../health/silo.ts";

Deno.test("silo: is a declared absence, not a probe", () => {
  assertEquals(silo.check, undefined);
  assert(silo.unavailable !== undefined);
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up. At any other severity this honest statement would pin the
 * app's verdict at `unknown` forever — which is the opposite of what declaring
 * it is for.
 */
Deno.test("silo: is informational, so declaring the gap cannot pin the verdict", () => {
  assertEquals(silo.severity, "informational");
});

/**
 * The reason has to survive being read by someone who did not write it, so it
 * names both blockers: parsing a credential outside `sign`, and an undocumented
 * claim-to-component mapping.
 */
Deno.test("silo: the reason names both reasons the answer is unavailable", () => {
  const reason = silo.unavailable!.reason;
  assert(reason.includes("sign"), reason);
  assert(reason.toLowerCase().includes("claim"), reason);
  assert(reason.length > 100, "a declared absence needs a real explanation");
});
