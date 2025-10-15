import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";

type Party = {
  id: string;
  name: string;
  firstRoundVotes: number;
  isFinalist?: boolean;
  lockedToBlank?: boolean;
};

const seedParties: Party[] = [
  { id: "ap", name: "AP", firstRoundVotes: 456002 },
  { id: "lyp", name: "LYP ADN", firstRoundVotes: 77576 },
  { id: "apb", name: "APB SÚMATE", firstRoundVotes: 361640 },
  { id: "lib", name: "LIBRE", firstRoundVotes: 1430176, isFinalist: true },
  { id: "fp", name: "FP", firstRoundVotes: 89253 },
  { id: "mas", name: "MAS-IPSP", firstRoundVotes: 169887 },
  { id: "uni", name: "UNIDAD", firstRoundVotes: 1054568 },
  { id: "pdc", name: "PDC", firstRoundVotes: 1717432, isFinalist: true },
  { id: "nul", name: "Nulo", firstRoundVotes: 1371049 },
  { id: "bla", name: "Blanco (fijo)", firstRoundVotes: 172835, lockedToBlank: true },
];

const pct = (num: number, den: number) => (den > 0 ? (100 * num) / den : 0);
const fmt = new Intl.NumberFormat();
const fmtPct = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export default function App() {
  const [parties, setParties] = useState<Party[]>(seedParties);
  const finalists = parties.filter((p) => p.isFinalist);
  const [leftFinal, rightFinal] = finalists;

  type Transfers = Record<string, { toLeft: number; toRight: number }>;
  const initialTransfers: Transfers = Object.fromEntries(
    parties.map((p) => [p.id, { toLeft: 50, toRight: 50 }])
  );
  const [transfers, setTransfers] = useState<Transfers>(initialTransfers);

  const totalVotes1 = useMemo(() => parties.reduce((acc, p) => acc + p.firstRoundVotes, 0), [parties]);

  function setTransfer(partyId: string, field: keyof Transfers[string], value: number) {
    setTransfers((prev) => {
      const cur = prev[partyId] || { toLeft: 0, toRight: 0 };
      const clamped = Math.max(0, Math.min(100, value));
      const otherField = field === "toLeft" ? "toRight" : "toLeft";
      const next = { ...cur, [field]: clamped, [otherField]: 100 - clamped };
      return { ...prev, [partyId]: next };
    });
  }

  // Ensure only two finalists can be selected
  function toggleFinalist(partyId: string) {
    setParties((prev) => {
      const currentFinalists = prev.filter((p) => p.isFinalist);
      const target = prev.find((p) => p.id === partyId);
      if (!target) return prev;

      // If already a finalist, deselect it
      if (target.isFinalist) {
        return prev.map((p) => (p.id === partyId ? { ...p, isFinalist: false } : p));
      }

      // If fewer than two finalists, allow adding this one
      if (currentFinalists.length < 2) {
        return prev.map((p) => (p.id === partyId ? { ...p, isFinalist: true } : p));
      }

      // Otherwise, prevent selecting more than two
      alert("Solo se pueden elegir dos finalistas.");
      return prev;
    });
  }

  const results = useMemo(() => {
    let left = 0;
    let right = 0;
    let blank = 0;

    for (const p of parties) {
      const t = transfers[p.id] || { toLeft: 0, toRight: 0 };
      const V = p.firstRoundVotes;

      if (p.lockedToBlank) {
        blank += V;
        continue;
      }
      if (p.isFinalist) {
        left += p.id === leftFinal?.id ? V : 0;
        right += p.id === rightFinal?.id ? V : 0;
        continue;
      }

      left += (t.toLeft / 100) * V;
      right += (t.toRight / 100) * V;
    }

    const cast = left + right + blank;
    const valid = left + right;
    return { left, right, blank, cast, valid };
  }, [parties, transfers, leftFinal?.id, rightFinal?.id]);

  function resetAll() {
    setParties(seedParties);
    setTransfers(Object.fromEntries(seedParties.map((p) => [p.id, { toLeft: 50, toRight: 50 }])) as Transfers);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Simulador de Segunda Vuelta (dos columnas)</h1>
            <p className="text-sm text-slate-600">Ajusta porcentajes entre los dos finalistas.</p>
          </div>
          <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-sm">Resetear</button>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <Card title={`Resultados balotaje`}>
            <div className="space-y-2">
              <ResultRow label={leftFinal?.name || "Finalista A"} value={results.left} pct={pct(results.left, results.valid)} highlight="left" />
              <ResultRow label={rightFinal?.name || "Finalista B"} value={results.right} pct={pct(results.right, results.valid)} highlight="right" />
              <ResultRow label="Blanco (fijo)" value={results.blank} pct={pct(results.blank, results.cast)} muted />
            </div>
          </Card>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Resultados 1ª vuelta y transferencias</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <Th>Partido</Th>
                  <Th className="text-right">Votos 1ª vuelta</Th>
                  <Th className="text-center">Finalista</Th>
                  <Th className="text-center">→ {leftFinal?.name || "A"}</Th>
                  <Th className="text-center">→ {rightFinal?.name || "B"}</Th>
                </tr>
              </thead>
              <tbody>
                {parties.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <Td>{p.name}</Td>
                    <Td className="text-right">
                      <input
                        type="number"
                        className="w-28 text-right bg-slate-50 border rounded-lg px-2 py-1"
                        value={p.firstRoundVotes}
                        onChange={(e) => setParties((prev) => prev.map((x) => (x.id === p.id ? { ...x, firstRoundVotes: Math.max(0, Number(e.target.value || 0)) } : x)))}
                      />
                    </Td>
                    <Td className="text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(p.isFinalist)}
                        onChange={() => toggleFinalist(p.id)}
                        disabled={p.lockedToBlank}
                      />
                    </Td>
                    {p.lockedToBlank ? (
                      <Td className="text-center text-slate-400" colSpan={2}>Fijo a Blanco</Td>
                    ) : p.isFinalist ? (
                      <Td className="text-center text-slate-400" colSpan={2}>Electores permanecen con su finalista</Td>
                    ) : (
                      <>
                        <Td><SliderCell value={transfers[p.id]?.toLeft ?? 0} onChange={(v) => setTransfer(p.id, "toLeft", v)} label="%" /></Td>
                        <Td><SliderCell value={transfers[p.id]?.toRight ?? 0} onChange={(v) => setTransfer(p.id, "toRight", v)} label="%" /></Td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`p-3 text-left text-xs font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 align-middle ${className}`}>{children}</td>;
}

function ResultRow({ label, value, pct, highlight, muted }: { label: string; value: number; pct: number; highlight?: "left" | "right"; muted?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <div className={`font-medium ${muted ? "text-slate-500" : ""}`}>{label}</div>
        <div className={`${muted ? "text-slate-500" : "font-semibold"}`}>{fmt.format(Math.round(value))} ({fmtPct.format(pct)}%)</div>
      </div>
      {!muted && (
        <div className="mt-1 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-2 ${highlight === "left" ? "bg-blue-500" : "bg-emerald-500"}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      )}
    </div>
  );
}

function SliderCell({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={0} max={100} value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value))} className="w-40" />
      <input type="number" className="w-16 text-right bg-slate-50 border rounded-lg px-2 py-1" value={Math.round(value)} min={0} max={100} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
