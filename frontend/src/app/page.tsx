"use client";

import React, { useState } from 'react';
import { Search, Sparkles, Settings as SettingsIcon, AlertCircle, History, X } from 'lucide-react';
import WorkflowVisualizer, { StepStatus } from '@/components/WorkflowVisualizer';
import SettingsModal from '@/components/SettingsModal';
import ReportViewer from '@/components/ReportViewer';

// Type for query history record
interface QueryRecord {
  issueKey: string;
  timestamp: string;
  summary: string;
}

export default function Home() {
  const [issueKey, setIssueKey] = useState('');
  const [customCoreIntent, setCustomCoreIntent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Query cache state
  const [queryHistory, setQueryHistory] = useState<QueryRecord[]>([]);
  const [showReQueryConfirm, setShowReQueryConfirm] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  // App State
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  // Config State with Persistence
  const [config, setConfig] = useState({
    gemini_api_key: '',
    customer_username: 'qiaoye.li',
    customer_password: 'lqy123456',
    customer_jira_url: 'https://jira.gacrnd.com:8443',
    internal_username: 'uie85246',
    internal_password: 'LQY123abcde',
    internal_jira_url: 'https://ix.jira.automotive.cloud',
    search_target: 'CUSTOMER',
    customer_project: 'XH2CONTI',
    internal_project: 'CGF',
    customer_issuetype: 'BUG',
    internal_issuetype: 'Problem Report (PR)',
    auto_save_enabled: true,
    save_format: 'markdown',
    save_path: ''
  });

  const [mounted, setMounted] = React.useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    setMounted(true);
    const savedConfig = localStorage.getItem('jira_ai_config');
    if (savedConfig) {
      try {
        setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }
    // Load query history
    const savedHistory = localStorage.getItem('jira_ai_query_history');
    if (savedHistory) {
      try {
        setQueryHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse query history", e);
      }
    }
  }, []);

  // Save to localStorage when config changes
  React.useEffect(() => {
    if (mounted) {
      localStorage.setItem('jira_ai_config', JSON.stringify(config));
    }
  }, [config, mounted]);

  // Save query history to localStorage
  React.useEffect(() => {
    if (mounted && queryHistory.length > 0) {
      localStorage.setItem('jira_ai_query_history', JSON.stringify(queryHistory));
    }
  }, [queryHistory, mounted]);


  // Auto-save report function
  const autoSaveReport = (data: any) => {
    if (!config.auto_save_enabled) return;

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `${data.issue_key}_Report_${timestamp}`;

    // Build content with sorted PRs
    let content = `# ${data.issue_key} 诊断报告\n\n`;
    content += `**生成时间**: ${now.toLocaleString('zh-CN')}\n\n`;
    content += `**摘要**: ${data.summary}\n\n`;
    content += `---\n\n## 诊断分析\n\n${data.report}\n\n`;

    if (data.trace?.historical_candidates?.length > 0) {
      content += `---\n\n## 相关历史 PR 参考\n\n`;
      const sorted = [...data.trace.historical_candidates].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
      sorted.forEach((cand: any, i: number) => {
        content += `### ${i + 1}. ${cand.key}\n\n`;
        content += `**标题**: ${cand.summary}\n\n`;
        content += `- **相似度**: ${cand.similarity || '中'} (${cand.score || 60}%)\n`;
        content += `- **推荐理由**: ${cand.reason || '语义匹配'}\n`;
        if (cand.root_cause) content += `- **已知根因**: ${cand.root_cause}\n`;
        content += `\n`;
      });
    }

    // Trigger download
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Check if PR was previously queried
  const checkPreviousQuery = (key: string): QueryRecord | undefined => {
    return queryHistory.find(q => q.issueKey.toUpperCase() === key.toUpperCase());
  };

  // Start diagnosis (called after cache check)
  const startDiagnosis = async (key: string) => {
    setIsLoading(true);
    setError(null);
    setDiagnosticResult(null);
    setShowReQueryConfirm(false);
    setPendingQuery(null);

    // Initial steps idle
    const steps = ['fetch', 'search', 'process', 'reason'];
    const newStatuses: Record<string, StepStatus> = {};
    steps.forEach(s => newStatuses[s] = 'idle');
    setStatuses(newStatuses);

    try {
      // Step 1: Start UI Flow
      setCurrentStep('fetch');
      setStatuses(prev => ({ ...prev, fetch: 'running' }));

      const controller = new AbortController();
      // Removed strict timeout to allow for comprehensive analysis

      const response = await fetch('http://localhost:8000/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          issue_key: key,
          custom_core_intent: customCoreIntent || null,
          ...config
        })
      });
      // No timeout to clear as it was removed


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

      // Record to query history
      const newRecord: QueryRecord = {
        issueKey: data.issue_key,
        timestamp: new Date().toISOString(),
        summary: data.summary || ''
      };
      setQueryHistory(prev => {
        const filtered = prev.filter(q => q.issueKey.toUpperCase() !== key.toUpperCase());
        return [newRecord, ...filtered].slice(0, 200); // Keep last 200
      });

      // Auto-save report
      autoSaveReport(data);

    } catch (err: any) {
      setError(err.message);
      setStatuses(prev => ({ ...prev, [currentStep || 'fetch']: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

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

    // Check if this PR was previously queried
    const previousQuery = checkPreviousQuery(issueKey);
    if (previousQuery) {
      setPendingQuery(issueKey);
      setShowReQueryConfirm(true);
      return;
    }

    // Start fresh diagnosis
    startDiagnosis(issueKey);
  };

  // Handle re-query confirmation
  const handleConfirmReQuery = () => {
    if (pendingQuery) {
      startDiagnosis(pendingQuery);
    }
  };

  const handleCancelReQuery = () => {
    setShowReQueryConfirm(false);
    setPendingQuery(null);
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[60%] -right-[5%] w-[30%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Re-query Confirmation Dialog */}
      {showReQueryConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <History className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">重复查询提醒</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
              <span className="font-mono font-bold text-indigo-600">{pendingQuery}</span> 已在之前查询过。
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              重新查询将消耗 API Token。确定要继续吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelReQuery}
                className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReQuery}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                确定重新查询
              </button>
            </div>
          </div>
        </div>
      )}

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
        <h1 className="text-5xl font-extrabold mb-10 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          AI智能诊断JIRA PR
        </h1>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <div className="flex items-center p-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 group focus-within:ring-2 ring-indigo-500/50 transition-all">
            <div className="pl-4 text-zinc-400">
              <Search className="w-6 h-6" />
            </div>
            <input
              type="text"
              placeholder="输入客户 Jira ID..."
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
          {/* Custom Core Intent Input */}
          <div className="mt-3">
            <input
              type="text"
              placeholder="(可选) 自定义核心意图关键词，多个用逗号分隔，如：CCU升级,OTA失败"
              value={customCoreIntent}
              onChange={(e) => setCustomCoreIntent(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-400 outline-none focus:ring-2 ring-indigo-500/50 transition-all"
            />
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
        trace={diagnosticResult?.trace}
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
