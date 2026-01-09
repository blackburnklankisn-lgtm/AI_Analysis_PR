"use client";

import React, { useState } from 'react';
import { Settings, X, Save, Globe, ShieldCheck, Search } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig: any;
}

export default function SettingsModal({ isOpen, onClose, onSave, initialConfig }: SettingsModalProps) {
  const [config, setConfig] = useState(initialConfig);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            系统设置
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Gemini Config */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={config.gemini_api_key}
              onChange={(e) => setConfig({ ...config, gemini_api_key: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-500"
              placeholder="输入您的 Gemini API Key"
            />
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* Customer Jira Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
              <Globe className="w-4 h-4" />
              <h3>客户 Jira 配置</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">用户名</label>
                <input
                  type="text"
                  value={config.customer_username}
                  onChange={(e) => setConfig({ ...config, customer_username: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Username"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">密码/Token</label>
                <input
                  type="password"
                  value={config.customer_password}
                  onChange={(e) => setConfig({ ...config, customer_password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Password"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-medium mb-1.5 opacity-70">URL</label>
                <input
                  type="text"
                  value={config.customer_jira_url}
                  onChange={(e) => setConfig({ ...config, customer_jira_url: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium mb-1.5 opacity-70">项目 ID</label>
                <input
                  type="text"
                  value={config.customer_project}
                  onChange={(e) => setConfig({ ...config, customer_project: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="如: XH2CONTI"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">单据类型 (Issuetype)</label>
                <input
                  type="text"
                  value={config.customer_issuetype}
                  onChange={(e) => setConfig({ ...config, customer_issuetype: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="如: BUG"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* Internal Jira Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <h3>内部 Jira 配置</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">用户名</label>
                <input
                  type="text"
                  value={config.internal_username}
                  onChange={(e) => setConfig({ ...config, internal_username: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Username"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">密码/Token</label>
                <input
                  type="password"
                  value={config.internal_password}
                  onChange={(e) => setConfig({ ...config, internal_password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Password"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-medium mb-1.5 opacity-70">URL</label>
                <input
                  type="text"
                  value={config.internal_jira_url}
                  onChange={(e) => setConfig({ ...config, internal_jira_url: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium mb-1.5 opacity-70">项目 ID</label>
                <input
                  type="text"
                  value={config.internal_project}
                  onChange={(e) => setConfig({ ...config, internal_project: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="如: CGF"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-70">单据类型 (Issuetype)</label>
                <input
                  type="text"
                  value={config.internal_issuetype}
                  onChange={(e) => setConfig({ ...config, internal_issuetype: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  placeholder="如: Problem Report (PR)"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* Search Target Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <Search className="w-4 h-4" />
              <h3>历史 PR 检索目标</h3>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setConfig({ ...config, search_target: 'CUSTOMER' })}
                className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${config.search_target === 'CUSTOMER'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
              >
                <div className="font-bold text-sm mb-0.5">客户 Jira</div>
                <div className="text-[10px] opacity-70">在客户平台检索相似单据</div>
              </button>
              <button
                onClick={() => setConfig({ ...config, search_target: 'INTERNAL' })}
                className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${config.search_target === 'INTERNAL'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
              >
                <div className="font-bold text-sm mb-0.5">内部 Jira</div>
                <div className="text-[10px] opacity-70">在公司内部库检索已解单据</div>
              </button>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

          {/* Auto-Save Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
              <Save className="w-4 h-4" />
              <h3>自动保存设置</h3>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="font-medium text-sm">自动保存诊断报告</div>
                <div className="text-[10px] text-zinc-500">报告生成后自动下载 Markdown 文件</div>
              </div>
              <button
                onClick={() => setConfig({ ...config, auto_save_enabled: !config.auto_save_enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${config.auto_save_enabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${config.auto_save_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
              </button>
            </div>

            {/* Save Path Configuration */}
            {config.auto_save_enabled && (
              <div className="space-y-2">
                <label className="block text-xs font-medium opacity-70">保存路径</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.save_path || ''}
                    onChange={(e) => setConfig({ ...config, save_path: e.target.value })}
                    placeholder="留空则使用浏览器默认下载目录"
                    className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="text-[11px] text-zinc-400 italic">
                  注：浏览器安全限制，文件会自动保存到浏览器下载目录
                </div>
              </div>
            )}
          </div>
        </div>



        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            取消
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors">
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
