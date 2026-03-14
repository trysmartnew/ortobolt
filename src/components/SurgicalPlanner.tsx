import React, { useState, useRef, useEffect } from 'react';
import { Calculator, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button } from '@/components/ui';

interface SurgicalPlannerProps {
  caseId: string;
}

interface CalcTab {
  id: string;
  label: string;
}

const CALC_TABS: CalcTab[] = [
  { id: 'tplo', label: 'TPLO' },
  { id: 'tta', label: 'TTA' },
  { id: 'fho', label: 'FHO' },
  { id: 'dosagem', label: 'Dosagem' },
];

interface Implant {
  id: string;
  label: string;
  color: string;
  w: number;
  h: number;
  specs: string;
}

const IMPLANTS: Implant[] = [
  { id: 'dcp45', label: 'DCP 4.5mm', color: '#3B82F6', w: 120, h: 12, specs: 'Torque máx: 300Nm · Indicação: ≤300kg' },
  { id: 'dcp35', label: 'DCP 3.5mm', color: '#10B981', w: 100, h: 10, specs: 'Torque máx: 120Nm · Indicação: <30kg' },
  { id: 'lcp50', label: 'LCP 5.0mm', color: '#8B5CF6', w: 140, h: 14, specs: 'Torque máx: 450Nm · Equinos >400kg: mín 8 parafusos' },
  { id: 'pino6', label: 'Pino IM 6mm', color: '#F59E0B', w: 8, h: 160, specs: 'Intramedular · Fraturas diafisárias simples' },
  { id: 'cage9', label: 'Cage TTA 9mm', color: '#EF4444', w: 30, h: 25, specs: 'Espaçador TTA · Tamanho 9mm' },
];

export default function SurgicalPlanner({ caseId }: SurgicalPlannerProps) {
  const [calcTab, setCalcTab] = useState('tplo');
  const [tplo, setTplo] = useState({ tpaAtual: '', tpaAlvo: '5.5', peso: '' });
  const [tta, setTta] = useState({ tpa: '', comprimentoPlateau: '' });
  const [fho, setFho] = useState({ especie: 'canino', peso: '' });
  const [dosagem, setDosagem] = useState({ especie: 'canino', peso: '' });
  const [selectedImplant, setSelectedImplant] = useState<string | null>(null);
  const [implantPos, setImplantPos] = useState({ x: 100, y: 100 });
  const [isDraggingImplant, setIsDraggingImplant] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeCase, addToast } = useApp();

  const calcTPLO = (tpaAtual: number, tpaAlvo: number, peso: number) => {
    const raio = peso < 15 ? 18 : peso < 30 ? 24 : peso < 50 ? 30 : 36;
    const avanco = raio * (Math.sin((tpaAtual * Math.PI) / 180) - Math.sin((tpaAlvo * Math.PI) / 180));
    const avancoArredondado = Math.round(avanco * 2) / 2;
    return {
      raio,
      avanco: avancoArredondado,
      placa: peso < 15 ? 'DCP 3.5mm' : peso < 30 ? 'DCP 3.5mm / LCP' : 'LCP 5.0mm',
    };
  };

  const calcTTA = (tpa: number, comprimentoPlateau: number) => {
    const LP = comprimentoPlateau * 3;
    const espacador = Math.abs(Math.sin(((tpa - 90) * Math.PI) / 180) * LP);
    const tamanhos = [3, 6, 9, 12, 15, 18, 21];
    const idx = tamanhos.findIndex(t => t >= espacador);
    return {
      espacador: espacador.toFixed(1),
      tamanhoInferior: tamanhos[Math.max(0, idx - 1)],
      tamanhoSuperior: tamanhos[idx] || 21,
    };
  };

  const calcFHO = (especie: string, peso: number) => {
    return {
      angulo: '110–115°',
      margemCorte: especie === 'felino' ? '2–3mm' : '3–5mm',
      clearance: '≥2mm',
      observacao: especie === 'felino'
        ? 'Felinos: corte conservador, preservar cápsula acetabular'
        : 'Caninos: verificar clearance antes de fechar',
    };
  };

  const calcDosagem = (especie: string, peso: number) => {
    const doses: Record<string, { min: number; max: number; unidade: string; freq: string }> = {
      meloxicam: especie === 'equino' ? { min: 0.6, max: 0.6, unidade: 'mg/kg', freq: 'SID' }
        : especie === 'felino' ? { min: 0.05, max: 0.05, unidade: 'mg/kg', freq: 'SID' }
        : { min: 0.1, max: 0.1, unidade: 'mg/kg', freq: 'SID' },
      tramadol: especie === 'felino' ? { min: 1, max: 2, unidade: 'mg/kg', freq: 'BID' }
        : { min: 2, max: 5, unidade: 'mg/kg', freq: 'TID' },
      dexmedetomidina: especie === 'felino' ? { min: 10, max: 40, unidade: 'mcg/kg', freq: 'IM' }
        : { min: 5, max: 20, unidade: 'mcg/kg', freq: 'IM' },
      cetamina: especie === 'equino' ? { min: 2.2, max: 2.2, unidade: 'mg/kg', freq: 'IV' }
        : { min: 5, max: 10, unidade: 'mg/kg', freq: 'IV' },
      morfina: especie === 'felino' ? { min: 0.1, max: 0.2, unidade: 'mg/kg', freq: 'IM' }
        : { min: 0.3, max: 0.5, unidade: 'mg/kg', freq: 'IM' },
    };

    return Object.entries(doses).map(([drug, d]) => ({
      drug,
      dose: `${(d.min * peso).toFixed(2)}–${(d.max * peso).toFixed(2)}${d.unidade.replace('/kg', '')}`,
      freq: d.freq,
      taxa: `${d.min}–${d.max} ${d.unidade}`,
    }));
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (activeCase?.imageUrl) {
      const img = new Image();
      img.src = activeCase.imageUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (selectedImplant) {
          const imp = IMPLANTS.find(i => i.id === selectedImplant);
          if (imp) {
            ctx.fillStyle = imp.color + '90';
            ctx.strokeStyle = imp.color;
            ctx.lineWidth = 2;
            ctx.fillRect(implantPos.x, implantPos.y, imp.w, imp.h);
            ctx.strokeRect(implantPos.x, implantPos.y, imp.w, imp.h);
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText(imp.label, implantPos.x + 4, implantPos.y + imp.h / 2 + 4);
          }
        }
      };
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#475569';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Sem imagem no caso', canvas.width / 2, canvas.height / 2);
    }
  }, [activeCase, selectedImplant, implantPos]);

  const handleExport = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'planejamento-ortobolt.png';
    a.click();
    addToast('Planejamento exportado!', 'success');
  };

  const handleCanvasMouseDown = () => {
    if (!selectedImplant) return;
    setIsDraggingImplant(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingImplant || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setImplantPos({ x: e.clientX - rect.left - 15, y: e.clientY - rect.top - 7 });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingImplant(false);
  };

  return (
    <div className="space-y-6">
      {/* Calculators */}
      <Card>
        <div className="flex gap-1 border-b border-slate-100 pb-0 px-4 pt-4">
          {CALC_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCalcTab(tab.id)}
              className={`px-3 py-2 text-xs font-semibold ${
                calcTab === tab.id
                  ? 'border-b-2 border-[#0056b3] text-[#0056b3]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {calcTab === 'tplo' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  placeholder="TPA Atual (°)"
                  value={tplo.tpaAtual}
                  onChange={(e) => setTplo({ ...tplo, tpaAtual: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="TPA Alvo (°)"
                  value={tplo.tpaAlvo}
                  onChange={(e) => setTplo({ ...tplo, tpaAlvo: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Peso (kg)"
                  value={tplo.peso}
                  onChange={(e) => setTplo({ ...tplo, peso: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {tplo.tpaAtual && tplo.peso && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {(() => {
                    const result = calcTPLO(Number(tplo.tpaAtual), Number(tplo.tpaAlvo), Number(tplo.peso));
                    return (
                      <>
                        <p className="text-xs font-semibold text-amber-800">Raio: {result.raio}mm</p>
                        <p className="text-xs font-semibold text-amber-800">Avanço: {result.avanco}mm</p>
                        <p className="text-xs font-semibold text-amber-800">Placa: {result.placa}</p>
                        <p className="text-[10px] text-amber-600 mt-1">⚠ Valor orientativo. Confirmar com goniômetro.</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {calcTab === 'tta' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="TPA (°)"
                  value={tta.tpa}
                  onChange={(e) => setTta({ ...tta, tpa: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Comprimento Plateau (mm)"
                  value={tta.comprimentoPlateau}
                  onChange={(e) => setTta({ ...tta, comprimentoPlateau: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {tta.tpa && tta.comprimentoPlateau && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  {(() => {
                    const result = calcTTA(Number(tta.tpa), Number(tta.comprimentoPlateau));
                    return (
                      <>
                        <p className="text-xs font-semibold text-blue-800">Espaçador estimado: {result.espacador}mm</p>
                        <p className="text-xs text-blue-700">Tamanho abaixo: {result.tamanhoInferior}mm | acima: {result.tamanhoSuperior}mm</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {calcTab === 'fho' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={fho.especie}
                  onChange={(e) => setFho({ ...fho, especie: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="canino">Canino</option>
                  <option value="felino">Felino</option>
                </select>
                <input
                  type="number"
                  placeholder="Peso (kg)"
                  value={fho.peso}
                  onChange={(e) => setFho({ ...fho, peso: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {fho.peso && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  {(() => {
                    const result = calcFHO(fho.especie, Number(fho.peso));
                    return (
                      <>
                        <p className="text-xs font-semibold text-emerald-800">Ângulo: {result.angulo}</p>
                        <p className="text-xs text-emerald-700">Margem de corte: {result.margemCorte}</p>
                        <p className="text-xs text-emerald-700">Clearance: {result.clearance}</p>
                        <p className="text-[10px] text-emerald-600 mt-1">{result.observacao}</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {calcTab === 'dosagem' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={dosagem.especie}
                  onChange={(e) => setDosagem({ ...dosagem, especie: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="canino">Canino</option>
                  <option value="felino">Felino</option>
                  <option value="equino">Equino</option>
                </select>
                <input
                  type="number"
                  placeholder="Peso (kg)"
                  value={dosagem.peso}
                  onChange={(e) => setDosagem({ ...dosagem, peso: e.target.value })}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {dosagem.peso && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-slate-600 font-semibold">Fármaco</th>
                        <th className="text-left py-2 text-slate-600 font-semibold">Dose total</th>
                        <th className="text-left py-2 text-slate-600 font-semibold">Via/Freq</th>
                        <th className="text-left py-2 text-slate-600 font-semibold">Taxa (mg/kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calcDosagem(dosagem.especie, Number(dosagem.peso)).map((d, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2 text-slate-700 capitalize">{d.drug}</td>
                          <td className="py-2 text-slate-700">{d.dose}</td>
                          <td className="py-2 text-slate-700">{d.freq}</td>
                          <td className="py-2 text-slate-700">{d.taxa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-amber-600 mt-2">⚠ Dosagens orientativas. Confirmar com protocolo clínico.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Implant Simulator */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Simulador de Implante</h3>
          <Button size="sm" variant="secondary" onClick={handleExport}>
            <Download size={14} /> Exportar PNG
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
          {/* Implant List */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-xs font-semibold text-slate-500 mb-2">Selecione o implante:</p>
            {IMPLANTS.map(implant => (
              <button
                key={implant.id}
                onClick={() => { setSelectedImplant(implant.id); setImplantPos({ x: 100, y: 100 }); }}
                className={`w-full border-2 rounded-lg p-2 text-xs font-semibold transition-all flex items-center gap-2 ${
                  selectedImplant === implant.id
                    ? 'border-[#0056b3] bg-blue-50 text-[#0056b3]'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: implant.color }} />
                {implant.label}
              </button>
            ))}
            {selectedImplant && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                <p className="text-[10px] text-blue-700">
                  {IMPLANTS.find(i => i.id === selectedImplant)?.specs}
                </p>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3">
            <canvas
              ref={canvasRef}
              width={480}
              height={360}
              className="rounded-xl border border-slate-200 cursor-crosshair w-full"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            <p className="text-[10px] text-slate-400 mt-1">Arraste para posicionar o implante sobre a radiografia</p>
          </div>
        </div>
      </Card>
    </div>
  );
}