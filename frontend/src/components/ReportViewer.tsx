"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Download, Share2 } from 'lucide-react';

interface ReportViewerProps {
    report: string;
    summary: string;
    issueKey: string;
}

export default function ReportViewer({ report, summary, issueKey }: ReportViewerProps) {
    if (!report) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Header */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-zinc-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{issueKey} 诊断报告</h3>
                            <p className="text-sm">{summary}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                            <Download className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 prose prose-zinc dark:prose-invert max-w-none">
                    <ReactMarkdown>{report}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
