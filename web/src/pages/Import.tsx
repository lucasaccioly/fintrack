import { CheckCircle2, FileUp, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../api/client";
import { useAccounts, useApiMutation } from "../api/hooks";
import { Button, Card, ErrorBox, Field, PageHeader, Select } from "../components/ui";
import { guessColumns, parseCsv } from "../lib/csv";
import { formatDate } from "../lib/dates";
import { type Mapping, toPreview } from "../lib/importRows";
import { formatBRL } from "../lib/money";

const MAX_ROWS = 2000;

async function readText(file: File) {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  // Many Brazilian banks still export Windows-1252; "�" means UTF-8 decoding failed.
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

export function ImportPage() {
  const accounts = useAccounts();
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [map, setMap] = useState<Mapping>({ date: -1, description: -1, amount: -1 });
  const [accountId, setAccountId] = useState("");
  const [readError, setReadError] = useState("");

  const preview = useMemo(
    () => (csv && map.date >= 0 && map.amount >= 0 && map.description >= 0 ? toPreview(csv.rows, map) : []),
    [csv, map],
  );
  const valid = preview.filter((r) => r.ok);
  const invalid = preview.filter((r) => !r.ok);

  const importMut = useApiMutation(() =>
    api<{ imported: number }>("/transactions/import", {
      method: "POST",
      body: { accountId, rows: valid.map((r) => r.ok && { date: r.date, description: r.description, amount: r.amount }) },
    }),
  );

  async function onFile(file?: File) {
    setReadError("");
    importMut.reset();
    if (!file) return;
    if (file.size > 2_000_000) return setReadError("Arquivo muito grande (máx. 2 MB).");
    const parsed = parseCsv(await readText(file));
    if (!parsed.headers.length) return setReadError("Arquivo vazio ou em formato não reconhecido.");
    if (parsed.rows.length > MAX_ROWS) return setReadError(`O arquivo tem ${parsed.rows.length} linhas; o máximo é ${MAX_ROWS}.`);
    setFileName(file.name);
    setCsv(parsed);
    setMap(guessColumns(parsed.headers));
  }

  if (importMut.data) {
    return (
      <>
        <PageHeader title="Importar extrato" />
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 size={40} className="text-emerald-500" />
          <p className="text-lg font-semibold">{importMut.data.imported} transações importadas</p>
          <div className="flex gap-2">
            <Link to="/transacoes"><Button>Ver transações</Button></Link>
            <Button variant="secondary" onClick={() => { importMut.reset(); setCsv(null); setFileName(""); }}>Importar outro</Button>
          </div>
        </Card>
      </>
    );
  }

  const column = (key: keyof Mapping, label: string) => (
    <Field label={label}>
      <Select value={map[key]} onChange={(e) => setMap({ ...map, [key]: Number(e.target.value) })}>
        <option value={-1}>Selecione a coluna…</option>
        {csv?.headers.map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>)}
      </Select>
    </Field>
  );

  return (
    <>
      <PageHeader title="Importar extrato" subtitle="Envie um CSV do seu banco. Valores negativos viram despesas, positivos viram receitas." />

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">1. Arquivo</h2>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/40">
          <Upload className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{fileName || "Clique para escolher um arquivo .csv"}</span>
          <span className="text-xs text-slate-500">Formatos aceitos: 31/01/2026, 1.234,56, separador ; ou ,</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Sem um extrato à mão? <a className="text-emerald-700 underline" href="/exemplo-extrato.csv" download>Baixe um exemplo</a>.
        </p>
        {readError && <p className="mt-2 text-sm text-rose-600" role="alert">{readError}</p>}
      </Card>

      {csv && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">2. Colunas e conta</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {column("date", "Data")}
            {column("description", "Descrição")}
            {column("amount", "Valor")}
            <Field label="Importar para a conta">
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Selecione…</option>
                {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          </div>
        </Card>
      )}

      {preview.length > 0 && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">3. Prévia</h2>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-emerald-700">{valid.length} válidas</span>
              {invalid.length > 0 && <> · <span className="font-medium text-rose-600">{invalid.length} com erro (serão ignoradas)</span></>}
            </p>
          </div>
          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                <tr><th className="p-2">Linha</th><th className="p-2">Data</th><th className="p-2">Descrição</th><th className="p-2 text-right">Valor</th></tr>
              </thead>
              <tbody>
                {preview.slice(0, 300).map((r) =>
                  r.ok ? (
                    <tr key={r.line} className="border-t border-slate-100">
                      <td className="p-2 text-slate-400">{r.line}</td>
                      <td className="p-2">{formatDate(r.date)}</td>
                      <td className="p-2">{r.description}</td>
                      <td className={`p-2 text-right tabular-nums ${r.amount > 0 ? "text-emerald-600" : ""}`}>{formatBRL(r.amount)}</td>
                    </tr>
                  ) : (
                    <tr key={r.line} className="border-t border-slate-100 bg-rose-50 text-rose-700">
                      <td className="p-2">{r.line}</td>
                      <td className="p-2" colSpan={2}>{r.raw.join(" | ")}</td>
                      <td className="p-2 text-right text-xs font-medium">{r.error}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          {preview.length > 300 && <p className="mt-2 text-xs text-slate-500">Mostrando as 300 primeiras linhas.</p>}
          <ErrorBox error={importMut.error} />
          <div className="mt-4 flex justify-end">
            <Button disabled={!accountId || !valid.length || importMut.isPending} onClick={() => importMut.mutate(undefined)}>
              <FileUp size={16} /> {importMut.isPending ? "Importando…" : `Importar ${valid.length} transações`}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
