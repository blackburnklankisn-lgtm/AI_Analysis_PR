"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Download, Share2, ChevronDown } from 'lucide-react';

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

// Helper function to download file with proper filename handling
function downloadFile(content: string, filename: string, mimeType: string) {
    // Add BOM for UTF-8 encoding (helps with Chinese characters in content)
    const BOM = '\uFEFF';
    const contentWithBOM = BOM + content;

    // Convert to base64 for data URI (more reliable than blob URL)
    const base64Content = btoa(unescape(encodeURIComponent(contentWithBOM)));
    const dataUri = `data:${mimeType};charset=utf-8;base64,${base64Content}`;

    // Create and trigger download
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Generate Markdown content (timestamp generated at export time, not render time)
function generateMarkdown(issueKey: string, summary: string, report: string, trace: ReportViewerProps['trace']): string {
    // Generate timestamp only when this function is called (during export)
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let md = `# ${issueKey} 诊断报告\n\n`;
    md += `**生成时间**: ${timestamp}\n\n`;
    md += `**摘要**: ${summary}\n\n`;
    md += `---\n\n`;
    md += `## 诊断分析\n\n${report}\n\n`;

    // Add sorted historical PRs (by similarity score, high to low)
    if (trace && trace.historical_candidates && trace.historical_candidates.length > 0) {
        md += `---\n\n## 相关历史 PR 参考\n\n`;
        md += `> 以下历史 PR 按相似度从高到低排序，供参考分析。\n\n`;

        // Sort by score descending
        const sortedCandidates = [...trace.historical_candidates].sort((a: any, b: any) =>
            (b.score || 0) - (a.score || 0)
        );

        sortedCandidates.forEach((cand: any, i) => {
            md += `### ${i + 1}. ${cand.key}\n\n`;
            md += `**标题**: ${cand.summary}\n\n`;
            md += `- **相似度**: ${cand.similarity || '中'} (${cand.score || 60}%)\n`;
            md += `- **推荐理由**: ${cand.reason || '语义匹配'}\n`;
            if (cand.root_cause) md += `- **已知根因**: ${cand.root_cause}\n`;
            md += `\n`;
        });
    }

    return md;
}

// Simple Markdown to HTML converter
function simpleMarkdownToHtml(md: string): string {
    let html = md
        // Escape HTML special chars first (but not our generated HTML)
        .replace(/&/g, '&amp;')

        // Headers (####, ###, ##, #)
        .replace(/^####\s*(.+)$/gm, '<h4>$1</h4>')
        .replace(/^###\s*(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s*(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s*(.+)$/gm, '<h1>$1</h1>')

        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')

        // Unordered lists (- item or * item)
        .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')

        // Ordered lists (1. item, 2. item)
        .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')

        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')

        // Blockquotes
        .replace(/^\s*>\s*(.+)$/gm, '<blockquote>$1</blockquote>')

        // Horizontal rules
        .replace(/^---+$/gm, '<hr>')

        // Line breaks (double newline = paragraph)
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>(\s*<br>)?)+/g, (match) => {
        const cleaned = match.replace(/<br>/g, '');
        return `<ul>${cleaned}</ul>`;
    });

    // Merge consecutive blockquotes
    html = html.replace(/(<\/blockquote>)\s*(<blockquote>)/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<blockquote')) {
        html = '<p>' + html + '</p>';
    }

    return html;
}

// Generate HTML content
function generateHTML(issueKey: string, summary: string, report: string, trace: ReportViewerProps['trace']): string {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Convert markdown report to HTML
    const reportHtml = simpleMarkdownToHtml(report);


    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${issueKey} 诊断报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f9fafb; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
        .header h1 { margin: 0 0 8px 0; }
        .header p { margin: 0; opacity: 0.9; }
        .section { background: white; padding: 20px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .section h2 { color: #4f46e5; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px; margin-top: 0; }
        .section h3 { color: #6366f1; margin-top: 16px; }
        .section h4 { color: #818cf8; margin-top: 12px; }
        .section p { margin: 8px 0; }
        .section ul { margin: 8px 0; padding-left: 24px; }
        .section li { margin: 4px 0; }
        .section code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        .section blockquote { border-left: 3px solid #6366f1; padding-left: 12px; margin: 12px 0; color: #6b7280; font-style: italic; }
        .section strong { color: #4f46e5; }
        .section hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
        .candidate { border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin-bottom: 12px; }
        .candidate-key { background: #eef2ff; color: #4f46e5; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .similarity { font-size: 11px; padding: 2px 8px; border-radius: 12px; margin-left: 8px; }
        .sim-high { background: #fee2e2; color: #dc2626; }
        .sim-medium { background: #ffedd5; color: #ea580c; }
        .sim-low { background: #dbeafe; color: #2563eb; }
        .timestamp { color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 8px; }
        .hint { color: #6b7280; font-size: 13px; font-style: italic; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${issueKey} 诊断报告</h1>
        <p>${summary}</p>
        <p class="timestamp">生成时间: ${timestamp}</p>
    </div>
    
    <div class="section">
        <h2>诊断分析</h2>
        <div class="report-content">${reportHtml}</div>
    </div>`;


    // Add sorted historical PRs (by similarity score, high to low)
    if (trace && trace.historical_candidates && trace.historical_candidates.length > 0) {
        // Sort by score descending
        const sortedCandidates = [...trace.historical_candidates].sort((a: any, b: any) =>
            (b.score || 0) - (a.score || 0)
        );

        html += `
    <div class="section">
        <h2>相关历史 PR 参考</h2>
        <p class="hint">以下历史 PR 按相似度从高到低排序，供参考分析。</p>`;

        sortedCandidates.forEach((cand: any, i) => {
            const simClass = cand.similarity === '极高' ? 'sim-high' : cand.similarity === '高' ? 'sim-medium' : 'sim-low';
            html += `
        <div class="candidate">
            <span class="candidate-key">${i + 1}. ${cand.key}</span>
            <span class="similarity ${simClass}">${cand.similarity || '中'} (${cand.score || 60}%)</span>
            <h3 style="margin: 12px 0 8px 0;">${cand.summary}</h3>
            <p><strong>推荐理由:</strong> ${cand.reason || '语义匹配'}</p>
            ${cand.root_cause ? `<p><strong>已知根因:</strong> ${cand.root_cause}</p>` : ''}
        </div>`;
        });

        html += `
    </div>`;
    }

    html += `
</body>
</html>`;


    return html;
}

export default function ReportViewer({ report, summary, issueKey, trace }: ReportViewerProps) {
    const [view, setView] = React.useState<'report' | 'trace'>('report');
    const [showExportMenu, setShowExportMenu] = React.useState(false);

    const handleExportMarkdown = () => {
        const content = generateMarkdown(issueKey, summary, report, trace);
        downloadFile(content, `${issueKey}_Report.md`, 'text/markdown');
        setShowExportMenu(false);
    };

    const handleExportHTML = () => {
        const content = generateHTML(issueKey, summary, report, trace);
        downloadFile(content, `${issueKey}_Report.html`, 'text/html');
        setShowExportMenu(false);
    };


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

                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
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

                        {/* Export Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                导出
                                <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                                    <button
                                        onClick={handleExportMarkdown}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        📄 导出 Markdown
                                    </button>
                                    <button
                                        onClick={handleExportHTML}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        🌐 导出 HTML
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* Content */}
                <div className="p-8">
                    {view === 'report' ? (
                        <div className="space-y-8">
                            {/* Main Report */}
                            <div className="prose prose-zinc dark:prose-invert max-w-none">
                                <ReactMarkdown>{report}</ReactMarkdown>
                            </div>

                            {/* Sorted Historical PRs */}
                            {trace?.historical_candidates && trace.historical_candidates.length > 0 && (
                                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-8">
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">相关历史 PR 参考</h3>
                                    <p className="text-sm text-zinc-500 mb-4">以下历史 PR 按相似度从高到低排序，供参考分析。</p>

                                    <div className="grid grid-cols-1 gap-3">
                                        {[...trace.historical_candidates]
                                            .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                                            .map((cand: any, i) => (
                                                <div key={i} className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-bold text-zinc-400">#{i + 1}</span>
                                                        <span className="text-sm font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded">
                                                            {cand.key}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cand.similarity === '极高' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                            cand.similarity === '高' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                            }`}>
                                                            {cand.similarity || '中'} ({cand.score || 60}%)
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{cand.summary}</h4>
                                                    <p className="text-xs text-zinc-500"><span className="font-medium text-indigo-500">推荐理由:</span> {cand.reason || '语义匹配'}</p>
                                                    {cand.root_cause && (
                                                        <p className="text-xs text-zinc-500 mt-1"><span className="font-medium text-emerald-500">已知根因:</span> {cand.root_cause}</p>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
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
                                                    {cand.created && (
                                                        <span className="text-[10px] text-zinc-400">
                                                            {new Date(cand.created).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 leading-snug">{cand.summary}</h5>

                                            <div className="space-y-2 mt-3">
                                                <div className="flex items-start gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                        <span className="font-bold text-indigo-500 mr-1">推荐理由:</span> {cand.reason}
                                                    </p>
                                                </div>

                                                {cand.root_cause && (
                                                    <div className="flex items-start gap-2 pt-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                            <span className="font-bold text-emerald-500 mr-1">已知根因:</span> {cand.root_cause}
                                                        </p>
                                                    </div>
                                                )}
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
