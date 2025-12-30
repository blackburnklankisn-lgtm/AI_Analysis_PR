"use client";

import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type StepStatus = 'idle' | 'running' | 'completed' | 'error';

interface Step {
    id: string;
    label: string;
    description: string;
}

const STEPS: Step[] = [
    { id: 'fetch', label: '抓取 PR', description: '获取 Jira 描述与附件' },
    { id: 'search', label: '搜索历史', description: '在内部库匹配相似问题' },
    { id: 'process', label: '日志分析', description: '提取错误特征指纹' },
    { id: 'reason', label: 'AI 诊断', description: 'Gemini 智能推理分析' },
];

interface WorkflowVisualizerProps {
    currentStep: string | null;
    statuses: Record<string, StepStatus>;
}

export default function WorkflowVisualizer({ currentStep, statuses }: WorkflowVisualizerProps) {
    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto py-8">
            <div className="relative flex justify-between">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-10" />

                {STEPS.map((step, index) => {
                    const status = statuses[step.id] || 'idle';
                    const isActive = currentStep === step.id;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 group">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                status === 'completed' ? "bg-green-500 border-green-500 text-white" :
                                    status === 'running' ? "bg-indigo-600 border-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]" :
                                        status === 'error' ? "bg-red-500 border-red-500 text-white" :
                                            "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                            )}>
                                {status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                                    status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                        <Circle className="w-6 h-6 fill-current opacity-20" />}
                            </div>
                            <div className="text-center">
                                <p className={cn(
                                    "text-sm font-bold transition-colors",
                                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500"
                                )}>
                                    {step.label}
                                </p>
                                <p className="text-[10px] opacity-60 hidden md:block max-w-[80px]">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
