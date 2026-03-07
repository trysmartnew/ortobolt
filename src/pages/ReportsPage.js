import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Download, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button, Card, Badge, SectionHeader, Spinner } from '@/components/ui';
import { MOCK_REPORTS, KPI_METRICS, CHART_DATA } from '@/data/mockData';
import { generateMonthlyReport, generateCaseReport } from '@/services/pdfService';
const TYPE_LABELS = { monthly: 'Mensal', case: 'Caso Clínico', audit: 'Auditoria', performance: 'Desempenho' };
const TYPE_COLORS = { monthly: 'blue', case: 'info', audit: 'warning', performance: 'success' };
export default function ReportsPage() {
    const { user, cases } = useApp();
    const [reports, setReports] = useState(MOCK_REPORTS);
    const [generating, setGenerating] = useState(null);
    const downloadMonthly = async () => {
        if (!user)
            return;
        setGenerating('monthly');
        try {
            await generateMonthlyReport(user, KPI_METRICS, CHART_DATA, cases);
        }
        finally {
            setGenerating(null);
        }
    };
    const downloadCase = async () => {
        if (!user)
            return;
        const completedCase = cases.find(c => c.aiAnalysis);
        if (!completedCase)
            return alert('Nenhum caso com análise IA disponível.');
        setGenerating('case');
        try {
            await generateCaseReport(completedCase, user);
        }
        finally {
            setGenerating(null);
        }
    };
    const StatusIcon = ({ status }) => {
        if (status === 'ready')
            return _jsx(CheckCircle, { className: "h-4 w-4 text-emerald-500" });
        if (status === 'generating')
            return _jsx(Spinner, { size: "sm" });
        return _jsx(AlertCircle, { className: "h-4 w-4 text-red-500" });
    };
    return (_jsxs("div", { className: "p-6 max-w-4xl space-y-6", children: [_jsx(SectionHeader, { title: "Relat\u00F3rios", subtitle: "Exporta\u00E7\u00E3o e an\u00E1lise de dados em PDF" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("div", { className: "w-10 h-10 bg-[#0056b3]/10 rounded-xl flex items-center justify-center", children: _jsx(FileText, { className: "h-5 w-5 text-[#0056b3]" }) }), _jsxs("div", { children: [_jsx("p", { className: "font-bold text-slate-900 text-sm", children: "Relat\u00F3rio Mensal" }), _jsx("p", { className: "text-xs text-slate-500", children: "KPIs, evolu\u00E7\u00E3o e casos do per\u00EDodo" })] })] }), _jsx("p", { className: "text-xs text-slate-500 mb-4 font-mono", children: "Inclui m\u00E9tricas de precis\u00E3o, volume de casos, taxa de sucesso e evolu\u00E7\u00E3o temporal dos \u00FAltimos 7 meses." }), _jsxs(Button, { className: "w-full", loading: generating === 'monthly', onClick: downloadMonthly, children: [_jsx(Download, { size: 14 }), " ", generating === 'monthly' ? 'Gerando...' : 'Gerar e Baixar PDF'] })] }), _jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("div", { className: "w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center", children: _jsx(CheckCircle, { className: "h-5 w-5 text-emerald-600" }) }), _jsxs("div", { children: [_jsx("p", { className: "font-bold text-slate-900 text-sm", children: "Relat\u00F3rio de Caso" }), _jsx("p", { className: "text-xs text-slate-500", children: "An\u00E1lise IA detalhada de um procedimento" })] })] }), _jsx("p", { className: "text-xs text-slate-500 mb-4 font-mono", children: "Exibe dados do paciente, landmarks detectados, score de precis\u00E3o, fatores de risco e recomenda\u00E7\u00F5es do OrthoVision." }), _jsxs(Button, { className: "w-full", variant: "secondary", loading: generating === 'case', onClick: downloadCase, children: [_jsx(Download, { size: 14 }), " ", generating === 'case' ? 'Gerando...' : 'Gerar Relatório de Caso'] })] })] }), _jsxs(Card, { className: "overflow-hidden", children: [_jsx("div", { className: "p-5 border-b border-slate-50", children: _jsx(SectionHeader, { title: "Hist\u00F3rico de Relat\u00F3rios", subtitle: `${reports.length} relatórios gerados` }) }), _jsx("div", { className: "divide-y divide-slate-50", children: reports.map(r => (_jsxs("div", { className: "flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors", children: [_jsx(StatusIcon, { status: r.status }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-semibold text-slate-900 truncate", children: r.title }), _jsxs("div", { className: "flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono", children: [_jsx(Clock, { size: 10 }), _jsx("span", { children: new Date(r.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }), r.sizeKb > 0 && _jsxs(_Fragment, { children: [_jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [r.sizeKb, " KB"] })] })] })] }), _jsx(Badge, { variant: TYPE_COLORS[r.type] || 'default', children: TYPE_LABELS[r.type] || r.type }), r.status === 'ready' && (_jsx("button", { className: "text-[#0056b3] hover:text-[#004494] transition-colors p-1.5 rounded-lg hover:bg-blue-50", children: _jsx(Download, { size: 15 }) }))] }, r.id))) })] })] }));
}
