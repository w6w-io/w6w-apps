import { assertEquals } from "@std/assert";
import { employeeBody } from "../../lib/employee.ts";

Deno.test("employeeBody: maps friendly keys onto Deputy's own PascalCase property names", () => {
  assertEquals(
    employeeBody({ firstName: "Ada", lastName: "Lovelace", position: "Engineer" }),
    { FirstName: "Ada", LastName: "Lovelace", Position: "Engineer" },
  );
});

Deno.test("employeeBody: drops fields that were left unset", () => {
  const body = employeeBody({ firstName: "Ada" });
  assertEquals(Object.keys(body), ["FirstName"]);
});

Deno.test("employeeBody: keeps an explicit false for active", () => {
  assertEquals(employeeBody({ active: false }), { Active: false });
});

Deno.test("employeeBody: merges Additional fields, letting them override a named field", () => {
  const body = employeeBody({
    firstName: "Ada",
    fields: '{"FirstName":"Override","Salutation":"Dr"}',
  });
  assertEquals(body, { FirstName: "Override", Salutation: "Dr" });
});

Deno.test("employeeBody: accepts Additional fields as an already-parsed object", () => {
  const body = employeeBody({ fields: { Role: 2 } });
  assertEquals(body, { Role: 2 });
});
