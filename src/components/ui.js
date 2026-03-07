import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
// ── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', className = '' }) {
    const styles = {
        default: 'bg-slate-100 text-slate-700', success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200', danger: 'bg-red-50 text-red-700 border border-red-200 animate-pulse',
        info: 'bg-sky-50 text-sky-700 border border-sky-200', blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    };
    return _jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-mono ${styles[variant]} ${className}`, children: children });
}
export function StatusBadge({ status }) {
    const map = {
        completed: { label: 'Concluído', variant: 'success' },
        in_analysis: { label: 'Em Análise', variant: 'info' },
        pending: { label: 'Pendente', variant: 'warning' },
        critical: { label: 'CRÍTICO', variant: 'danger' },
    };
    const { label, variant } = map[status];
    return _jsx(Badge, { variant: variant, children: label });
}
export function NotifBadge({ type }) {
    const map = {
        alert: { label: 'Alerta', variant: 'danger' }, info: { label: 'Info', variant: 'info' },
        success: { label: 'Sucesso', variant: 'success' }, warning: { label: 'Atenção', variant: 'warning' },
    };
    const { label, variant } = map[type];
    return _jsx(Badge, { variant: variant, children: label });
}
export function Button({ children, variant = 'primary', size = 'md', loading, className = '', disabled, ...props }) {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-[#0056b3] text-white hover:bg-[#004494] focus:ring-[#0056b3] shadow-sm',
        secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300 shadow-sm',
        ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    };
    const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
    return _jsxs("button", { className: `${base} ${variants[variant]} ${sizes[size]} ${className}`, disabled: disabled || loading, ...props, children: [loading && _jsx("span", { className: "w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" }), children] });
}
// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
    return _jsx("div", { className: `bg-white rounded-xl border border-slate-100 shadow-sm ${className}`, children: children });
}
// ── KPI Widget ───────────────────────────────────────────────────────────────
export function KPIWidget({ label, value, unit, trend, trendDirection, color }) {
    const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
    const trendColor = trendDirection === 'up' ? 'text-emerald-600' : trendDirection === 'down' ? 'text-red-500' : 'text-slate-500';
    return (_jsxs(Card, { className: "p-5 relative overflow-hidden group hover:shadow-md transition-shadow", children: [_jsx("div", { className: "absolute top-0 left-0 w-1 h-full rounded-l-xl", style: { backgroundColor: color } }), _jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 pl-2", children: label }), _jsxs("div", { className: "flex items-end justify-between pl-2", children: [_jsxs("span", { className: "text-3xl font-bold font-mono text-slate-900 tracking-tight", children: [value, _jsx("span", { className: "text-base font-medium text-slate-500 ml-0.5", children: unit })] }), _jsxs("div", { className: `flex items-center gap-1 text-xs font-semibold ${trendColor}`, children: [_jsx(TrendIcon, { className: "h-3.5 w-3.5" }), " ", Math.abs(trend), "%"] })] }), _jsx("p", { className: "text-[10px] text-slate-400 mt-1.5 pl-2", children: "vs. m\u00EAs anterior" })] }));
}
// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
    const s = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-2', lg: 'w-10 h-10 border-3' }[size];
    return _jsx("span", { className: `${s} border-[#0056b3] border-t-transparent rounded-full animate-spin inline-block` });
}
// ── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
    return _jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-slate-900", style: { fontFamily: 'Montserrat, sans-serif' }, children: title }), subtitle && _jsx("p", { className: "text-sm text-slate-500 mt-0.5", children: subtitle })] }), action] });
}
// ── Precision Gauge ──────────────────────────────────────────────────────────
export function PrecisionGauge({ value, size = 80 }) {
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const filled = (value / 100) * circ * 0.75;
    const offset = circ * 0.25;
    const color = value >= 95 ? '#059669' : value >= 85 ? '#0056b3' : value >= 70 ? '#d97706' : '#dc2626';
    return (_jsxs("div", { className: "relative", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { transform: 'rotate(135deg)' }, children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: "#e2e8f0", strokeWidth: "8", strokeDasharray: `${circ * 0.75} ${circ * 0.25}`, strokeDashoffset: -offset, strokeLinecap: "round" }), _jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: color, strokeWidth: "8", strokeDasharray: `${filled} ${circ - filled}`, strokeDashoffset: -offset, strokeLinecap: "round", style: { transition: 'stroke-dasharray 0.5s ease' } })] }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsxs("span", { className: "text-xs font-bold font-mono", style: { color }, children: [value.toFixed(0), "%"] }) })] }));
}
// ── Risk Tag ─────────────────────────────────────────────────────────────────
export function RiskTag({ level }) {
    const map = { low: { label: 'Baixo', cls: 'bg-emerald-50 text-emerald-700' }, medium: { label: 'Médio', cls: 'bg-amber-50 text-amber-700' }, high: { label: 'Alto', cls: 'bg-red-50 text-red-700' } };
    return _jsx("span", { className: `text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${map[level].cls}`, children: map[level].label });
}
// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm", onClick: onClose, children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-5 border-b border-slate-100", children: [_jsx("h3", { className: "font-bold text-slate-900", style: { fontFamily: 'Montserrat' }, children: title }), _jsx("button", { onClick: onClose, className: "text-slate-400 hover:text-slate-600 text-xl leading-none", children: "\u2715" })] }), _jsx("div", { className: "p-5", children: children })] }) }));
}
// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }) {
    return _jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center gap-3", children: [_jsx("div", { className: "text-slate-200", children: icon }), _jsx("p", { className: "font-semibold text-slate-500", children: title }), _jsx("p", { className: "text-sm text-slate-400 max-w-xs", children: description })] });
}
