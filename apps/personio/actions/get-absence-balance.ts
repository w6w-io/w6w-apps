import type { ActionDefinition } from "@w6w/types";
import { requestJson } from "../lib/client.ts";

/**
 * `GET /company/employees/{employee_id}/absences/balance` — one entry per absence type,
 * with TWO different balance figures that answer different questions:
 * `balance` is what remains as of today, only deducting time already taken (an upcoming,
 * approved vacation next month does not reduce it yet); `available_balance` additionally
 * deducts upcoming approved absences, i.e. what is actually still free to plan.
 */
interface Input {
  employeeId: number;
}

interface BalanceEntry {
  id?: number;
  name?: string;
  category?: string;
  balance?: number;
  available_balance?: number;
}

interface BalanceResponse {
  data?: BalanceEntry[];
}

const getAbsenceBalance: ActionDefinition<Input, unknown> = {
  key: "get-absence-balance",
  type: "read",
  resource: "absence",
  title: "Get Absence Balance",
  description: "Get an employee's absence balance per absence type — how much remains " +
    "(`balance`) and how much is still free to plan after upcoming absences " +
    "(`availableBalance`).",
  params: [
    { key: "employeeId", label: "Employee ID", type: "number", required: true },
  ],
  output: [
    { key: "balances", type: "array", label: "Absence balances" },
  ],

  async execute(input, ctx) {
    const res = await requestJson<BalanceResponse>(
      ctx,
      `/company/employees/${encodeURIComponent(String(input.employeeId))}/absences/balance`,
    );
    const balances = (res.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      balance: b.balance,
      availableBalance: b.available_balance,
    }));
    return { balances };
  },
};

export default getAbsenceBalance;
