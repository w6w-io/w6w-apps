import { assertEquals } from "@std/assert";
import { compact, flattenAttributes, flattenTimeOffPeriod } from "../../lib/client.ts";

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" });
  assertEquals(out, { d: false, e: 0, f: "x" });
});

Deno.test("flattenAttributes: unwraps { label, value, type, universal_id } into plain values", () => {
  const out = flattenAttributes({
    first_name: {
      label: "First name",
      value: "Alexander",
      type: "standard",
      universal_id: "first_name",
    },
    id: { label: "ID", value: 1, type: "integer", universal_id: "id" },
  });
  assertEquals(out, { first_name: "Alexander", id: 1 });
});

Deno.test("flattenAttributes: recursively flattens a nested { type, attributes } relationship", () => {
  const out = flattenAttributes({
    supervisor: {
      label: "Supervisor",
      value: {
        type: "Employee",
        attributes: { id: { label: "ID", value: 2, type: "integer", universal_id: "id" } },
      },
      type: "standard",
      universal_id: "supervisor",
    },
  });
  assertEquals(out, { supervisor: { type: "Employee", id: 2 } });
});

Deno.test("flattenAttributes: flattens each element of a wrapped array value", () => {
  const out = flattenAttributes({
    cost_centers: {
      label: "Cost center",
      value: [
        { type: "CostCenter", attributes: { id: 1, name: "CC1" } },
      ],
      type: "standard",
      universal_id: "cost_centers",
    },
  });
  assertEquals(out, { cost_centers: [{ type: "CostCenter", id: 1, name: "CC1" }] });
});

Deno.test("flattenAttributes: undefined attributes object returns an empty record", () => {
  assertEquals(flattenAttributes(undefined), {});
});

Deno.test("flattenTimeOffPeriod: reads top-level fields as PLAIN scalars, not label/value", () => {
  const out = flattenTimeOffPeriod({
    type: "TimeOffPeriod",
    attributes: {
      id: 12345,
      status: "approved",
      start_date: "2017-12-27",
      time_off_type: { attributes: { id: 1, name: "Vacation", category: "offsite_work" } },
      employee: {
        attributes: {
          first_name: {
            label: "First name",
            value: "Michael",
            type: "standard",
            universal_id: "first_name",
          },
        },
      },
    },
  }) as Record<string, unknown>;

  assertEquals(out.id, 12345);
  assertEquals(out.status, "approved");
  assertEquals(out.timeOffType, { id: 1, name: "Vacation", category: "offsite_work" });
  // The embedded employee, unlike every other field on this object, IS unwrapped from
  // the per-field label/value wrapper — see the module doc.
  assertEquals((out.employee as Record<string, unknown>).first_name, "Michael");
});

Deno.test("flattenTimeOffPeriod: undefined period returns undefined", () => {
  assertEquals(flattenTimeOffPeriod(undefined), undefined);
});
