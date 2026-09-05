import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 20 actions, one auth method, and three health checks", () => {
  assertEquals(app.actions.length, 20);
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "pod", "quota"]);
});

Deno.test("index: every action key is unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(key), true, `"${key}" is not kebab-case`);
  }
});

Deno.test("index: every action declares execute and a valid type", () => {
  for (const action of app.actions) {
    assertExists(action.execute, `${action.key} is missing execute`);
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
  }
});

Deno.test("index: perform actions declare `idempotent` explicitly", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} must declare idempotent`);
  }
});

Deno.test("index: covers get/get-many/create/update/delete for all four objects", () => {
  const keys = new Set(app.actions.map((a) => a.key));
  for (const obj of ["contact", "organisation", "opportunity", "lead"]) {
    for (const op of ["get", "get-many", "create", "update", "delete"]) {
      assertEquals(keys.has(`${obj}-${op}`), true, `missing ${obj}-${op}`);
    }
  }
});
