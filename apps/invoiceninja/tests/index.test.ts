import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 40 actions, one auth method, and two health checks", () => {
  assertEquals(app.actions.length, 40);
  assertEquals(app.auth?.map((a) => a.key), ["api-token"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "instance"]);
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

Deno.test("index: no action file ever sets the X-API-TOKEN header itself", () => {
  // Credentials belong only to `auth/api-token.ts`'s `sign` hook. A static
  // source scan of every action file, since that source is the boundary the
  // sandbox actually enforces.
  const dir = new URL("../actions/", import.meta.url);
  let scanned = 0;
  for (const entry of Deno.readDirSync(dir)) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    scanned++;
    const source = Deno.readTextFileSync(new URL(entry.name, dir));
    assertEquals(/x-api-token/i.test(source), false, `${entry.name} sets X-API-TOKEN itself`);
  }
  assertEquals(scanned, 40, "expected to scan all 40 action files");
});
