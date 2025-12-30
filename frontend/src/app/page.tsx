"use client";

import React, { useState } from 'react';
import { Search, Sparkles, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import WorkflowVisualizer, { StepStatus } from '@/components/WorkflowVisualizer';
import SettingsModal from '@/components/SettingsModal';
import ReportViewer from '@/components/ReportViewer';

export default function Home() {
  const [issueKey, setIssueKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App State
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  // Config State (Should ideally be in localStorage)
  const [config, setConfig] = useState({
    gemini_api_key: '',
    customer_username: '',
    customer_password: '',
    customer_jira_url: 'https://jira.gacrnd.com:8443',
    internal_username: '',
    internal_password: '',
    internal_jira_url: 'https://ix.jira.automotive.cloud'
  });

  const handleDiagnose = async () => {
    if (!issueKey) return;

    // Check if configuration is complete
    const isConfigComplete =
      config.gemini_api_key &&
      config.customer_username && config.customer_password &&
      config.internal_username && config.internal_password;

    if (!isConfigComplete) {
      setError('请先在设置中完整配置 API Key 及双端 Jira 凭据');
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDiagnosticResult(null);

    // Initial steps idle
    const steps = ['fetch', 'search', 'process', 'reason'];
    const newStatuses: Record<string, StepStatus> = {};
    steps.forEach(s => newStatuses[s] = 'idle');
    setStatuses(newStatuses);

    try {
      // Step 1: Start UI Flow
      setCurrentStep('fetch');
      setStatuses(prev => ({ ...prev, fetch: 'running' }));

      const response = await fetch('http://localhost:8000/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_key: issueKey,
          ...config
        })
      });

      if (!response.ok) {
        const err = await response.json();
        const errorMessage = typeof err.detail === 'string'
          ? err.detail
          : JSON.stringify(err.detail);
        throw new Error(errorMessage || '诊断过程发生错误');
      }

      const data = await response.json();

      // Update visualized steps to completed upon success
      setStatuses({
        fetch: 'completed',
        search: 'completed',
        process: 'completed',
        reason: 'completed'
      });
      setCurrentStep(null);
      setDiagnosticResult(data);

    } catch (err: any) {
      setError(err.message);
      setStatuses(prev => ({ ...prev, [currentStep || 'fetch']: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[60%] -right-[5%] w-[30%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header / Nav */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Jira AI Diagnostic</span>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors relative"
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
      </nav>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          智能诊断，秒级响应
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">
          基于 Google Gemini 的汽车电子软件 PR 诊断助手。输入客户 Jira ID，自动检索内部库并生成专业分析报告。
        </p>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <div className="flex items-center p-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 group focus-within:ring-2 ring-indigo-500/50 transition-all">
            <div className="pl-4 text-zinc-400">
              <Search className="w-6 h-6" />
            </div>
            <input
              type="text"
              placeholder="输入客户 Jira ID (例如: GAC-1234)..."
              value={issueKey}
              onChange={(e) => setIssueKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
              className="w-full px-4 py-3 bg-transparent outline-none text-lg font-medium"
            />
            <button
              onClick={handleDiagnose}
              disabled={isLoading || !issueKey}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              {isLoading ? '解析中...' : '开始诊断'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-red-500 font-medium mb-4 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Workflow Visualization */}
        {(isLoading || diagnosticResult) && (
          <WorkflowVisualizer currentStep={currentStep} statuses={statuses} />
        )}
      </div>

      {/* Report Section */}
      <ReportViewer
        report={diagnosticResult?.report}
        summary={diagnosticResult?.summary}
        issueKey={diagnosticResult?.issue_key}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={setConfig}
        initialConfig={config}
      />

      {/* Footer */}
      <footer className="py-20 text-center text-zinc-400 text-sm">
        Built with Google Gemini & FastAPI & Next.js
      </footer>
    </main>
  );
}
