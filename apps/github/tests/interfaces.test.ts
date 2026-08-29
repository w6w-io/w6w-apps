import { assertEquals, assertFalse } from "@std/assert";
import type { InterfaceConformance, InterfaceMethodImpl } from "@w6w/types";
import app from "../index.ts";
import refGet from "../actions/ref-get.ts";
import fileGet from "../actions/file-get.ts";
import fileCreateOrUpdate from "../actions/file-create-or-update.ts";
import fileDelete from "../actions/file-delete.ts";

/**
 * §S-2's declaration is asserted here, never host-verified (D-3) — this suite
 * is the only thing that would catch a typo'd action key or a missing
 * required param before it ships and 422s at GitHub. See T2.2.1's contract.
 */

const INTERFACE_ID = "blob-store@1";
const METHOD_KEYS = ["delete", "get", "headRef", "list", "put"] as const;

// §S-1's canonical inputs for blob-store@1, keyed by method.
const CANONICAL_INPUTS: Record<string, string[]> = {
  headRef: ["owner", "repository", "branch"],
  list: ["owner", "repository", "path", "ref"],
  get: ["owner", "repository", "path", "ref"],
  put: ["owner", "repository", "path", "content", "expectedSha"],
  delete: ["owner", "repository", "path", "expectedSha"],
};

// deno-lint-ignore no-explicit-any
const ACTIONS_BY_KEY: Record<string, any> = {
  "ref-get": refGet,
  "file-get": fileGet,
  "file-create-or-update": fileCreateOrUpdate,
  "file-delete": fileDelete,
};

function conformance(): InterfaceConformance {
  const conformances: InterfaceConformance[] = app.interfaces ?? [];
  return conformances[0];
}

Deno.test("interfaces: exactly one blob-store@1 conformance with the five method keys", () => {
  const conformances: InterfaceConformance[] = app.interfaces ?? [];
  assertEquals(conformances.length, 1);
  assertEquals(conformances[0].interfaceId, INTERFACE_ID);
  assertEquals(Object.keys(conformances[0].methods).sort(), [...METHOD_KEYS].sort());
});

Deno.test("interfaces: every uses.action names an action this app actually has", () => {
  const actionKeys = new Set(app.actions.map((a) => a.key));
  const methods = conformance().methods;
  for (const method of METHOD_KEYS) {
    const impl = methods[method];
    assertEquals(
      actionKeys.has(impl.uses.action),
      true,
      `${method}: "${impl.uses.action}" is not one of this app's action keys`,
    );
  }
});

Deno.test("interfaces: headRef and put outputMaps are pinned exactly", () => {
  const methods = conformance().methods;
  assertEquals(methods.headRef.outputMap, { sha: { "$": "output.object.sha" } });
  assertEquals(methods.headRef.with, undefined);
  assertEquals(methods.put.outputMap, { sha: { "$": "output.content.sha" } });
});

Deno.test("interfaces: put/delete carry the literal commitMessage; delete's sha is wired", () => {
  const methods = conformance().methods;
  assertEquals(typeof methods.put.with?.commitMessage, "string");
  assertEquals(methods.put.with?.commitMessage, "w6w interface sync");
  assertEquals(typeof methods.delete.with?.commitMessage, "string");
  assertEquals(methods.delete.with?.commitMessage, "w6w interface sync");
  assertEquals(methods.delete.with?.sha, { "$": "inputs.expectedSha" });
});

Deno.test("interfaces: no method binding names an app", () => {
  const methods = conformance().methods;
  for (const method of METHOD_KEYS) {
    assertFalse("app" in methods[method].uses, `${method}.uses must not carry an "app" key`);
  }
});

Deno.test("interfaces: every required param of the bound action is covered", () => {
  const methods = conformance().methods;
  for (const method of METHOD_KEYS) {
    const impl: InterfaceMethodImpl = methods[method];
    // deno-lint-ignore no-explicit-any
    const action = ACTIONS_BY_KEY[impl.uses.action] as { params: any[] };
    const required: string[] = action.params.filter((p) => p.required).map((p) => p.key);
    const withKeys = Object.keys(impl.with ?? {});
    const canonical = CANONICAL_INPUTS[method] ?? [];
    for (const key of required) {
      const covered = withKeys.includes(key) || canonical.includes(key);
      assertEquals(
        covered,
        true,
        `${method}: required param "${key}" is supplied by neither "with" nor the canonical inputs`,
      );
    }
  }
});

Deno.test("interfaces: the rest of the app export is unchanged", () => {
  assertEquals(app.actions.length, 25);
  assertEquals(app.auth.length, 2);
  assertEquals(app.healthChecks.length, 2);
});
