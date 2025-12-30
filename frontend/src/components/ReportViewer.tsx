"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Download, Share2 } from 'lucide-react';

interface ReportViewerProps {
    report: string;
    summary: string;
    issueKey: string;
    trace?: {
        extracted_keywords: string[];
        stratified_keywords?: {
            core_intent: string[];
            fingerprints: string[];
            general_terms: string[];
        };
        initial_search_query: string;
        historical_candidates: { key: string; summary: string }[];
        deep_context_count: number;
        raw_prompt: string;
        raw_ai_response: string;
    };
}

export default function ReportViewer({ report, summary, issueKey, trace }: ReportViewerProps) {
    const [view, setView] = React.useState<'report' | 'trace'>('report');

    if (!report) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Header */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{issueKey} 诊断结果</h3>
                            <p className="text-sm text-zinc-500">{summary}</p>
                        </div>
                    </div>

                    <div className="flex bg-zinc-200 dark:bg-zinc-700 p-1 rounded-xl">
                        <button
                            onClick={() => setView('report')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'report' ? 'bg-white dark:bg-zinc-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
                        >
                            诊断报告
                        </button>
                        <button
                            onClick={() => setView('trace')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'trace' ? 'bg-white dark:bg-zinc-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
                        >
                            执行链路 (调试)
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    {view === 'report' ? (
                        <div className="prose prose-zinc dark:prose-invert max-w-none">
                            <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <section>
                                <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-4 border-b border-indigo-100 dark:border-indigo-900/50 pb-1">1. 关键信息提取 (Keywords)</h4>

                                {trace?.stratified_keywords ? (
                                    <div className="space-y-4">
                                        {/* Core Intent */}
                                        <div>
                                            <div className="text-[10px] font-bold text-blue-500 uppercase mb-1 flex items-center gap-1">
                                                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                                核心意图 (Core Intent)
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {trace.stratified_keywords.core_intent.map((kw, i) => (
                                                    <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-800">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Fingerprints */}
                                        <div>
                                            <div className="text-[10px] font-bold text-emerald-500 uppercase mb-1 flex items-center gap-1">
                                                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                                硬核指纹 (Fingerprints)
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {trace.stratified_keywords.fingerprints.map((kw, i) => (
                                                    <span key={i} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-mono border border-emerald-100 dark:border-emerald-800">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* General Terms */}
                                        <div>
                                            <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1">
                                                <div className="w-1 h-1 bg-zinc-400 rounded-full" />
                                                通用词 (General Terms)
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {trace.stratified_keywords.general_terms.map((kw, i) => (
                                                    <span key={i} className="px-3 py-1 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs border border-zinc-200 dark:border-zinc-700">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {trace?.extracted_keywords.map((kw, i) => (
                                            <span key={i} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-full text-sm font-mono border border-indigo-100 dark:border-indigo-800">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section>
                                <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">2. 全局 JQL 检索语句 (Global Search Query)</h4>
                                <code className="block p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm break-all font-mono">
                                    {trace?.initial_search_query}
                                </code>
                            </section>

                            <section>
                                <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">3. 召回的历史相关 PR (Candidates & Relevance)</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {trace?.historical_candidates.map((cand: any, i) => (
                                        <div key={i} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group shadow-sm hover:shadow-md">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-800">
                                                        {cand.key}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${cand.similarity === '极高' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                        cand.similarity === '高' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                            'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                        }`}>
                                                        相似度: {cand.similarity} ({cand.score}%)
                                                    </span>
                                                </div>
                                            </div>
                                            <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 leading-snug">{cand.summary}</h5>
                                            <div className="flex items-start gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                    <span className="font-bold text-indigo-500 mr-1">推荐理由:</span> {cand.reason}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 text-xs text-zinc-400 italic flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-zinc-400" />
                                    当前检索上限为 20 个结果，实际召回 {trace?.historical_candidates.length} 个（已对其中 {trace?.deep_context_count} 个进行全量详情分析）。
                                </div>
                            </section>

                            <section>
                                <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">4. 构造的 Prompt (发送给 AI)</h4>
                                <pre className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 leading-relaxed max-h-96">
                                    {trace?.raw_prompt}
                                </pre>
                            </section>

                            <section>
                                <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">5. AI 原始响应 (Raw Output)</h4>
                                <pre className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 leading-relaxed max-h-96">
                                    {trace?.raw_ai_response}
                                </pre>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
