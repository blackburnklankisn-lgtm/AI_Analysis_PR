"use client";

import React, { useState } from 'react';
import { Settings, X, Save, Globe, ShieldCheck } from 'lucide-react';

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
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70">URL</label>
              <input
                type="text"
                value={config.customer_jira_url}
                onChange={(e) => setConfig({ ...config, customer_jira_url: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
              />
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
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70">URL</label>
              <input
                type="text"
                value={config.internal_jira_url}
                onChange={(e) => setConfig({ ...config, internal_jira_url: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
              />
            </div>
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
