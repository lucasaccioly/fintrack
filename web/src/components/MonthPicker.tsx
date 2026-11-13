import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthLabel } from "../lib/dates";

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button className="p-2 text-slate-500 hover:text-slate-900" onClick={() => onChange(addMonths(value, -1))} aria-label="Mês anterior">
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-36 text-center text-sm font-medium text-slate-700">{monthLabel(value)}</span>
      <button className="p-2 text-slate-500 hover:text-slate-900" onClick={() => onChange(addMonths(value, 1))} aria-label="Próximo mês">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
