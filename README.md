# Jira-AI-Diagnostic-Agent (Web版)

这是一个专门为汽车电子软件工程师设计的 Jira PR 自动化预诊断工具。它结合了 FastAPI 后端、Next.js 前端以及 Google Gemini AI 能力。

## 主要特性

1.  **多源 Jira 接入**: 同时连接客户 Jira 和内部 Jira，实现跨库检索。
2.  **智能日志压缩**: 自动扫描数 MB 级别的日志，提取 `Error`, `Fail`, `DTC` 等特征片段。
3.  **Gemini RAG 诊断**: 将当前问题与 Top-3 历史相似 PR 进行对比，由 AI 生成专业诊断报告。
4.  **可视化工作流**: 实时展示抓取、搜索、分析到推理的全流程状态。

## 快速开始

### 1. 环境准备
- Python 3.9+
- Node.js 18+
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### 2. 后端部署 (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows 使用 venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
后端将运行在 `http://localhost:8000`。

### 3. 前端部署 (Next.js)
```bash
cd frontend
npm install
npm run dev
```
前端将运行在 `http://localhost:3000`。

### 4. 配置
1. 打开浏览器访问 `http://localhost:3000`。
2. 点击右上角的 **<setting> (齿轮图标)**。
3. 输入你的 **Gemini API Key**、**Jira 用户名** 和 **密码/Token**。
4. 保存配置。

## 提示与技巧

- **SSL 问题**: 工具默认已设置为 `verify=False` 以处理部分内部 Jira 的证书问题。
- **日志格式**: 建议上传 `.log` 或 `.txt` 格式的附件。
- **自定义关键词**: 可以在 `backend/src/log_processor.py` 中修改正则匹配逻辑以适应特定项目的 DTC 或错误码。

## 项目结构
- `backend/`: Python 核心逻辑，包含 Jira 连接器、日志处理器和 AI 接口。
- `frontend/`: 基于 Next.js 的现代化响应式 UI。
```
