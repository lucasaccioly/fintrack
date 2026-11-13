export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function addMonths(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
export const monthLabel = (month: string) => {
  const s = monthFmt.format(new Date(`${month}-01T00:00:00Z`)); // "novembro de 2026"
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const monthShort = (month: string) => shortFmt.format(new Date(`${month}-01T00:00:00Z`)).replace(".", "");
export const formatDate = (ymd: string) => ymd.split("-").reverse().join("/");
export const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
