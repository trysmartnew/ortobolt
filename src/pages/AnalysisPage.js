import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Scan, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { analyzeImage } from '@/services/aiService';
import { Button, Card, Spinner, SectionHeader } from '@/components/ui';
export default function AnalysisPage() {
    const [mode, setMode] = useState('idle');
    const [imageData, setImageData] = useState(null);
    const [result, setResult] = useState(null);
    const [streamError, setStreamError] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileRef = useRef(null);
    const streamRef = useRef(null);
    const startCamera = async () => {
        setStreamError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setMode('camera');
        }
        catch {
            setStreamError('Câmera indisponível. Use upload de arquivo.');
        }
    };
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);
    const capture = () => {
        if (!videoRef.current || !canvasRef.current)
            return;
        const v = videoRef.current;
        const c = canvasRef.current;
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext('2d')?.drawImage(v, 0, 0);
        const data = c.toDataURL('image/jpeg', 0.85);
        setImageData(data);
        stopCamera();
        setMode('preview');
    };
    const handleFile = (e) => {
        const f = e.target.files?.[0];
        if (!f)
            return;
        const reader = new FileReader();
        reader.onload = ev => { setImageData(ev.target?.result); setMode('preview'); };
        reader.readAsDataURL(f);
    };
    const analyze = async () => {
        if (!imageData)
            return;
        setMode('analyzing');
        const base64 = imageData.split(',')[1] || imageData;
        const res = await analyzeImage(base64);
        setResult(res);
        setMode('result');
    };
    const reset = () => { setMode('idle'); setImageData(null); setResult(null); setStreamError(''); stopCamera(); };
    // Parse markdown-ish result
    const renderResult = (text) => text.split('\n').map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**'))
            return _jsx("h4", { className: "font-bold text-slate-900 mt-3 mb-1", children: line.slice(2, -2) }, i);
        if (line.startsWith('- ') || line.startsWith('• '))
            return _jsx("li", { className: "ml-4 text-sm text-slate-700 list-disc", children: line.slice(2) }, i);
        if (line.startsWith('#'))
            return _jsx("h3", { className: "font-bold text-[#0056b3] text-base mt-4 mb-2", children: line.replace(/^#+\s/, '') }, i);
        if (line === '')
            return _jsx("br", {}, i);
        return _jsx("p", { className: "text-sm text-slate-700", children: line }, i);
    });
    return (_jsxs("div", { className: "p-6 max-w-4xl space-y-5", children: [_jsx(SectionHeader, { title: "An\u00E1lise de Imagem Ortop\u00E9dica", subtitle: "Vis\u00E3o computacional powered by Gemini 2.0 \u00B7 OrthoVision v3.2" }), mode === 'idle' && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("button", { onClick: startCamera, className: "flex flex-col items-center gap-4 p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#0056b3] hover:bg-blue-50/50 transition-all group", children: [_jsx("div", { className: "w-14 h-14 rounded-2xl bg-[#0056b3]/10 flex items-center justify-center group-hover:bg-[#0056b3]/20 transition-colors", children: _jsx(Camera, { className: "h-7 w-7 text-[#0056b3]" }) }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "font-bold text-slate-900", children: "C\u00E2mera ao Vivo" }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "Capture imagem radiogr\u00E1fica ou procedimento via webcam" })] })] }), _jsxs("button", { onClick: () => fileRef.current?.click(), className: "flex flex-col items-center gap-4 p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#0056b3] hover:bg-blue-50/50 transition-all group", children: [_jsx("div", { className: "w-14 h-14 rounded-2xl bg-[#0056b3]/10 flex items-center justify-center group-hover:bg-[#0056b3]/20 transition-colors", children: _jsx(Upload, { className: "h-7 w-7 text-[#0056b3]" }) }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "font-bold text-slate-900", children: "Upload de Imagem" }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "JPG, PNG, DICOM \u2014 radiografias, ecografias, tomografias" })] })] }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", className: "hidden", onChange: handleFile })] })), streamError && _jsxs("div", { className: "bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm", children: [_jsx(AlertCircle, { size: 16 }), streamError] }), mode === 'camera' && (_jsxs(Card, { className: "overflow-hidden", children: [_jsxs("div", { className: "relative bg-black rounded-xl overflow-hidden", children: [_jsx("video", { ref: videoRef, className: "w-full max-h-[400px] object-cover", autoPlay: true, muted: true, playsInline: true }), _jsx("div", { className: "absolute inset-0 pointer-events-none flex items-center justify-center", children: _jsxs("div", { className: "border-2 border-[#0056b3]/50 w-64 h-64 rounded-lg", children: [_jsx("div", { className: "absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#0056b3]" }), _jsx("div", { className: "absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#0056b3]" }), _jsx("div", { className: "absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#0056b3]" }), _jsx("div", { className: "absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#0056b3]" })] }) }), _jsxs("div", { className: "absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-mono", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-white animate-pulse" }), " AO VIVO"] })] }), _jsxs("div", { className: "p-4 flex gap-3 justify-center", children: [_jsxs(Button, { onClick: capture, children: [_jsx(Camera, { size: 15 }), " Capturar Imagem"] }), _jsxs(Button, { variant: "secondary", onClick: () => { stopCamera(); setMode('idle'); }, children: [_jsx(X, { size: 15 }), " Cancelar"] })] })] })), (mode === 'preview' || mode === 'analyzing') && imageData && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5", children: [_jsxs(Card, { className: "p-4", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3", children: "Imagem Capturada" }), _jsx("img", { src: imageData, alt: "An\u00E1lise", className: "w-full rounded-xl border border-slate-100 object-contain max-h-80" })] }), _jsxs(Card, { className: "p-5 flex flex-col justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4", children: "Configura\u00E7\u00F5es de An\u00E1lise" }), _jsx("div", { className: "space-y-3", children: [['Modelo', 'OrthoVision v3.2'], ['Modo', 'Análise Ortopédica Completa'], ['Espécie alvo', 'Multi-espécie'], ['Detecção', 'Landmarks + Patologias']].map(([k, v]) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-slate-500", children: k }), _jsx("span", { className: "font-mono font-medium text-slate-800", children: v })] }, k))) })] }), _jsxs("div", { className: "space-y-2 mt-4", children: [mode === 'analyzing' ? (_jsxs("div", { className: "flex items-center justify-center gap-3 py-4", children: [_jsx(Spinner, {}), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-slate-700", children: "Analisando imagem..." }), _jsx("p", { className: "text-xs text-slate-400 font-mono", children: "OrthoVision processando landmarks anat\u00F4micos" })] })] })) : (_jsxs(Button, { className: "w-full", size: "lg", onClick: analyze, children: [_jsx(Scan, { size: 15 }), " Iniciar An\u00E1lise IA"] })), _jsxs(Button, { variant: "secondary", className: "w-full", onClick: reset, children: [_jsx(RefreshCw, { size: 14 }), " Nova imagem"] })] })] })] })), mode === 'result' && result && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5", children: [_jsxs(Card, { className: "p-4", children: [_jsx("p", { className: "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3", children: "Imagem Analisada" }), imageData && _jsx("img", { src: imageData, alt: "Resultado", className: "w-full rounded-xl border border-slate-100 object-contain max-h-80" })] }), _jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(CheckCircle, { className: "h-5 w-5 text-emerald-500" }), _jsx("p", { className: "font-bold text-slate-900", style: { fontFamily: 'Montserrat' }, children: "An\u00E1lise Conclu\u00EDda" })] }), _jsx("div", { className: "prose-sm space-y-1 overflow-y-auto max-h-[320px] pr-1", children: renderResult(result) }), _jsx("div", { className: "mt-4 pt-4 border-t border-slate-100", children: _jsxs(Button, { variant: "secondary", size: "sm", onClick: reset, className: "w-full", children: [_jsx(RefreshCw, { size: 13 }), " Nova An\u00E1lise"] }) })] })] })), _jsx("canvas", { ref: canvasRef, className: "hidden" }), mode === 'idle' && (_jsx("div", { className: "grid grid-cols-3 gap-4", children: [
                    { title: 'Precisão', value: '94.7%', sub: 'Média do modelo' },
                    { title: 'Landmarks', value: '23+', sub: 'Pontos detectados' },
                    { title: 'Tempo', value: '~1.2s', sub: 'Por análise' },
                ].map(({ title, value, sub }) => (_jsxs(Card, { className: "p-4 text-center", children: [_jsx("p", { className: "text-2xl font-bold font-mono text-[#0056b3]", children: value }), _jsx("p", { className: "text-xs font-semibold text-slate-700 mt-1", children: title }), _jsx("p", { className: "text-[10px] text-slate-400 font-mono", children: sub })] }, title))) }))] }));
}
