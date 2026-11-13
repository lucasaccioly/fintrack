import { api, qs } from "../api/client";
import type { Page, Transaction, TxFilters } from "../api/types";
import { formatDate, today } from "./dates";
import { formatBRL } from "./money";

const MAX_EXPORT = 5000;

async function fetchAll(filters: TxFilters) {
  const items: Transaction[] = [];
  for (let page = 1; items.length < MAX_EXPORT; page++) {
    const res = await api<Page<Transaction>>(`/transactions${qs({ ...filters, page, pageSize: 100 })}`);
    items.push(...res.items);
    if (items.length >= res.total || !res.items.length) break;
  }
  return items.slice(0, MAX_EXPORT);
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exports the transactions matching the current filters. Libraries are lazy-loaded (heavy). */
export async function exportTransactions(filters: TxFilters, format: "pdf" | "xlsx") {
  const items = await fetchAll(filters);
  const signed = (t: Transaction) => (t.kind === "INCOME" ? t.amount : -t.amount);
  const total = items.reduce((s, t) => s + signed(t), 0);
  const name = `fintrack-transacoes-${today()}`;

  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("FinTrack: Transações", 14, 18);
    doc.setFontSize(9);
    doc.text(`Gerado em ${formatDate(today())} · ${items.length} transações · Saldo do período: ${formatBRL(total)}`, 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [["Data", "Descrição", "Categoria", "Conta", "Valor"]],
      body: items.map((t) => [formatDate(t.date), t.description, t.category.name, t.account.name, formatBRL(signed(t))]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 150, 105] },
      columnStyles: { 4: { halign: "right" } },
    });
    doc.save(`${name}.pdf`);
    return;
  }

  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Transações");
  ws.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Descrição", key: "description", width: 40 },
    { header: "Categoria", key: "category", width: 18 },
    { header: "Conta", key: "account", width: 20 },
    { header: "Tipo", key: "kind", width: 10 },
    { header: "Valor (R$)", key: "amount", width: 14, style: { numFmt: '"R$" #,##0.00;[Red]-"R$" #,##0.00' } },
  ];
  ws.getRow(1).font = { bold: true };
  for (const t of items) {
    ws.addRow({
      date: new Date(`${t.date}T12:00:00`),
      description: t.description,
      category: t.category.name,
      account: t.account.name,
      kind: t.kind === "INCOME" ? "Receita" : "Despesa",
      amount: signed(t) / 100,
    });
  }
  ws.getColumn("date").numFmt = "dd/mm/yyyy";
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${name}.xlsx`);
}
