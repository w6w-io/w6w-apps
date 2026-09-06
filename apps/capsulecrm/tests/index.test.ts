import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 19 actions, one auth method, and two health checks", () => {
  assertEquals(app.actions.length, 19);
  assertEquals(app.auth?.map((a) => a.key), ["personal-access-token"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
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

Deno.test("index: covers list/create/update/delete for party, opportunity and task", () => {
  const keys = new Set(app.actions.map((a) => a.key));
  for (const obj of ["party", "opportunity", "task"]) {
    for (const op of ["list", "create", "update", "delete"]) {
      assertEquals(keys.has(`${obj}-${op}`), true, `missing ${obj}-${op}`);
    }
  }
});

Deno.test("index: auth declares a required test hook and a sign hook", () => {
  const auth = app.auth?.[0];
  assertExists(auth?.test);
  assertExists(auth?.sign);
  assertEquals(auth?.type, "bearer");
});
