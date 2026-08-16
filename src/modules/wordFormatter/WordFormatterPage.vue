<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWordFormatterStore } from './stores/wordFormatterStore'
import DocumentSummary from './components/DocumentSummary.vue'
import DocumentAuditCard from './components/DocumentAuditCard.vue'
import TemplateSelector from './components/TemplateSelector.vue'
import RecognitionSummary from './components/RecognitionSummary.vue'
import RecognitionTable from './components/RecognitionTable.vue'
import FormatOptions from './components/FormatOptions.vue'
import TocSettings from './components/TocSettings.vue'
import ExecutionProgress from './components/ExecutionProgress.vue'
import ExecutionResult from './components/ExecutionResult.vue'
import TemplateEditor from './components/TemplateEditor.vue'
import DryRunModal from './components/DryRunModal.vue'
import CleanupModal from './components/CleanupModal.vue'
import DiagnosticsModal from './components/DiagnosticsModal.vue'
import BackupPromptModal from './components/BackupPromptModal.vue'
import { wpsWriterAdapter } from './adapters/WpsWriterAdapter'
import type { CleanupIssue } from './types/cleanup'
import { logger, LogEntry } from '@/shared/logger/logger'
import { 
  Play, 
  RotateCcw, 
  Wand2, 
  ListOrdered, 
  Settings, 
  ScrollText,
  Undo2,
  FileCheck2,
  Copy,
  Trash2,
  Check,
  Eye,
  Activity
} from 'lucide-vue-next'

const store = useWordFormatterStore()
const recTableRef = ref<any>(null)
const showTemplateEditor = ref(false)
const showDryRunModal = ref(false)
const showCleanupModal = ref(false)
const logEntries = ref<LogEntry[]>([])
const copySuccessToast = ref<string | null>(null)

const handleOpenDryRun = () => {
  store.generatePlan()
  showDryRunModal.value = true
}

const handleApplyFromDryRun = async () => {
  showDryRunModal.value = false
  await store.executeFormat()
  refreshLogs()
}

const handleExecuteCleanup = async (issues: CleanupIssue[]) => {
  const res = await store.executeCleanup(issues)
  if (res.success) {
    showCleanupModal.value = false
  }
  refreshLogs()
}

const executeButtonText = computed(() => {
  if (store.formatStatus === 'formatting') return '正在排版...'
  switch (store.formatScope) {
    case 'tables-only': return '一键仅修表格 (三线表)'
    case 'headings-only': return '一键仅修标题大纲'
    case 'body-only': return '一键仅修正文与空行'
    case 'page-only': return '一键仅修页面设置'
    default: return store.formatStrategy === 'minimal' ? '一键最小修复排版' : '一键完整标准化排版'
  }
})

onMounted(async () => {
  await store.init()
  refreshLogs()

  // Listen to ribbon custom events
  window.addEventListener('wps:quick-scan', () => {
    store.scanDocument()
  })
  window.addEventListener('wps:undo-format', () => {
    store.undoFormat()
  })
})

const refreshLogs = () => {
  logEntries.value = logger.getLogs()
}

const handleClearLogs = () => {
  logger.clear()
  logEntries.value = []
}

const handleCopyLogs = async () => {
  if (logEntries.value.length === 0) {
    copySuccessToast.value = '暂无日志'
    setTimeout(() => { copySuccessToast.value = null }, 1200)
    return
  }

  const text = logEntries.value.map(l => `${l.timestamp} [${l.level}] [${l.module}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`).join('\n')
  
  let copied = false
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text)
      copied = true
    }
  } catch {}

  if (!copied) {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      copied = true
    } catch {}
  }

  copySuccessToast.value = '已复制全部日志！'
  setTimeout(() => {
    copySuccessToast.value = null
  }, 1800)
}

const handleFilterRole = (role: string) => {
  store.activeTab = 'recognition'
  setTimeout(() => {
    if (recTableRef.value?.setFilter) {
      recTableRef.value.setFilter(role)
    }
  }, 50)
}

const handleExecuteFormat = async () => {
  await store.executeFormat()
  refreshLogs()
}

const handleUndo = async () => {
  await store.undoFormat()
  refreshLogs()
}
</script>

<template>
  <div class="app-layout">
    <!-- Top Bar -->
    <header class="app-header">
      <div class="logo-area">
        <div class="logo-icon">
          <Wand2 class="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 class="app-title">智能文档排版</h1>
          <span class="app-version">WPS Writer JS Add-in v1.0</span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="nav-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: store.activeTab === 'main' }"
          @click="store.activeTab = 'main'"
        >
          <FileCheck2 class="w-3.5 h-3.5" />
          <span>排版主页</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: store.activeTab === 'recognition' }"
          @click="store.activeTab = 'recognition'"
        >
          <ListOrdered class="w-3.5 h-3.5" />
          <span>识别明细 ({{ store.effectiveRecognition.length }})</span>
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: store.activeTab === 'logs' }"
          @click="store.activeTab = 'logs'; refreshLogs()"
        >
          <ScrollText class="w-3.5 h-3.5" />
          <span>运行日志</span>
        </button>
        <button 
          class="tab-btn btn-diag-trigger" 
          @click="store.openDiagnosticsModal()"
          title="WPS 环境与接口能力深度诊断"
        >
          <Activity class="w-3.5 h-3.5 text-blue-500" />
          <span>环境诊断</span>
        </button>
      </nav>
    </header>

    <!-- Main Content Area -->
    <main class="main-viewport">
      <!-- TAB 1: Main Overview -->
      <div v-show="store.activeTab === 'main'" class="tab-pane main-pane">
        <!-- 1. Document summary card -->
        <DocumentSummary />

        <!-- 2. Pre-format Health Audit Card -->
        <DocumentAuditCard @open-cleanup="showCleanupModal = true" />

        <!-- 3. Execution Result / Progress -->
        <ExecutionProgress />
        <ExecutionResult />

        <!-- 4. Template selector -->
        <TemplateSelector @open-editor="showTemplateEditor = true" />

        <!-- 5. Recognition summary chips -->
        <RecognitionSummary @filter-role="handleFilterRole" />

        <!-- 6. Advanced format options -->
        <FormatOptions />

        <!-- 7. Automatic Table of Contents (TOC) -->
        <TocSettings />
      </div>

      <!-- TAB 2: Recognition Detail Table -->
      <div v-show="store.activeTab === 'recognition'" class="tab-pane recognition-pane">
        <RecognitionTable ref="recTableRef" />
      </div>

      <!-- TAB 3: System Logs -->
      <div v-show="store.activeTab === 'logs'" class="tab-pane logs-pane">
        <div class="logs-header">
          <span class="logs-title">日志记录 ({{ logEntries.length }} 条)</span>
          <div class="logs-actions">
            <button class="btn-log-action btn-copy-logs" @click="handleCopyLogs" title="复制所有运行日志到剪贴板">
              <Copy class="w-3 h-3 inline mr-1" />
              <span>{{ copySuccessToast || '复制全部' }}</span>
            </button>
            <button class="btn-log-action btn-clear-logs" @click="handleClearLogs" title="清空当前日志">
              <Trash2 class="w-3 h-3 inline mr-1" />
              <span>清空</span>
            </button>
          </div>
        </div>
        <div class="log-list">
          <div 
            v-for="(log, idx) in logEntries" 
            :key="idx" 
            class="log-item"
            :class="`log-${log.level.toLowerCase()}`"
          >
            <span class="log-time">{{ log.timestamp }}</span>
            <span class="log-level">[{{ log.level }}]</span>
            <span class="log-mod">[{{ log.module }}]</span>
            <span class="log-msg">{{ log.message }}</span>
          </div>
          <div v-if="logEntries.length === 0" class="empty-logs-tip">
            暂无日志记录
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Action Bar with Scope & Strategy Selectors -->
    <footer class="app-footer">
      <!-- Strategy Selector -->
      <div class="strategy-bar">
        <span class="scope-label">排版策略:</span>
        <div class="strategy-chips">
          <button 
            class="strategy-chip" 
            :class="{ active: store.formatStrategy === 'minimal' }"
            @click="store.setFormatStrategy('minimal')"
            title="只修改与模板不一致的属性，已合规格式不再重复写入"
          >
            ● 最小修复
          </button>
          <button 
            class="strategy-chip" 
            :class="{ active: store.formatStrategy === 'normalize' }"
            @click="store.setFormatStrategy('normalize')"
            title="按模板规范完整重新标准化应用全部格式"
          >
            ○ 完整标准化
          </button>
        </div>
      </div>

      <!-- Scope Selector -->
      <div class="scope-bar">
        <span class="scope-label">排版范围:</span>
        <div class="scope-chips">
          <button 
            class="scope-chip" 
            :class="{ active: store.formatScope === 'all' }"
            @click="store.setFormatScope('all')"
          >
            全文档
          </button>
          <button 
            class="scope-chip" 
            :class="{ active: store.formatScope === 'tables-only' }"
            @click="store.setFormatScope('tables-only')"
          >
            仅修表格
          </button>
          <button 
            class="scope-chip" 
            :class="{ active: store.formatScope === 'headings-only' }"
            @click="store.setFormatScope('headings-only')"
          >
            仅修标题
          </button>
          <button 
            class="scope-chip" 
            :class="{ active: store.formatScope === 'body-only' }"
            @click="store.setFormatScope('body-only')"
          >
            仅修正文
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="footer-buttons">
        <button 
          v-if="store.lastSnapshotAvailable" 
          class="btn-footer-undo" 
          :disabled="store.formatStatus === 'formatting'"
          @click="handleUndo"
          title="一键撤销上次排版"
        >
          <RotateCcw class="w-4 h-4" />
          <span>撤销</span>
        </button>

        <button 
          class="btn-footer-preview" 
          :disabled="store.formatStatus === 'formatting' || store.scanStatus === 'scanning'"
          @click="handleOpenDryRun"
          title="生成并查看预计修改清单，不修改文档"
        >
          <Eye class="w-3.5 h-3.5" />
          <span>预览修改</span>
        </button>

        <button 
          class="btn-execute" 
          :disabled="store.formatStatus === 'formatting' || store.scanStatus === 'scanning'"
          @click="handleExecuteFormat"
        >
          <Play class="w-4 h-4 fill-white" />
          <span>{{ executeButtonText }}</span>
        </button>
      </div>
    </footer>

    <!-- Template Editor Modal -->
    <TemplateEditor 
      :show="showTemplateEditor" 
      @close="showTemplateEditor = false" 
    />

    <!-- Dry Run Preview Modal -->
    <DryRunModal 
      :show="showDryRunModal" 
      @close="showDryRunModal = false" 
      @apply="handleApplyFromDryRun" 
    />

    <!-- Document Cleanup & Purge Modal -->
    <CleanupModal
      :visible="showCleanupModal"
      :issues="store.cleanupIssues"
      :categories="store.cleanupCategories"
      :adapter="wpsWriterAdapter"
      :executing="store.cleanupExecuting"
      @close="showCleanupModal = false"
      @execute="handleExecuteCleanup"
      @locate="store.selectParagraphInDoc"
    />

    <!-- WPS Environment Diagnostics Modal (V2.4) -->
    <DiagnosticsModal
      :visible="store.showDiagnosticsModal"
      @close="store.closeDiagnosticsModal"
    />

    <!-- Automatic Backup Prompt Modal (V2.4) -->
    <BackupPromptModal
      :visible="store.showBackupPromptModal"
      :prompt-type="store.backupPromptType"
      :doc-name="store.backupPromptDocName"
      :doc-path="store.backupPromptDocPath"
      @save-and-continue="store.resolveBackupDecision('save-and-continue')"
      @skip-backup="store.resolveBackupDecision('skip-backup')"
      @cancel="store.resolveBackupDecision('cancel')"
    />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--wps-bg);
  overflow: hidden;
}

.app-header {
  background: #ffffff;
  border-bottom: 1px solid var(--wps-border);
  padding: 10px 12px 0 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, var(--wps-primary), #3b82f6);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(24, 90, 219, 0.25);
}

.app-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--wps-text-main);
  line-height: 1.2;
}

.app-version {
  font-size: 10px;
  color: var(--wps-text-light);
}

.nav-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid transparent;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--wps-text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--wps-primary);
}

.tab-btn.active {
  color: var(--wps-primary);
  border-bottom-color: var(--wps-primary);
  font-weight: 600;
}

.main-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recognition-pane {
  height: 100%;
  gap: 0;
}

.main-pane {
  padding-bottom: 10px;
}

.logs-pane {
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-lg);
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.logs-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--wps-text-main);
}

.logs-actions {
  display: flex;
  gap: 6px;
}

.btn-log-action {
  background: #f8fafc;
  border: 1px solid var(--wps-border);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--wps-text-main);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.15s ease;
}

.btn-log-action:hover {
  background: #e2e8f0;
  color: var(--wps-primary);
}

.btn-copy-logs {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
  font-weight: 500;
}

.btn-copy-logs:hover {
  background: #dbeafe;
}

.btn-clear-logs {
  color: #64748b;
}

.btn-clear-logs:hover {
  color: #dc2626;
  border-color: #fecaca;
  background: #fef2f2;
}

.log-list {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 8px;
  user-select: text;
}

.log-item {
  display: flex;
  gap: 5px;
  line-height: 1.45;
  word-break: break-all;
  user-select: text;
}

.empty-logs-tip {
  color: var(--wps-text-muted);
  font-size: 11px;
  text-align: center;
  padding: 20px 0;
}

.log-time { color: #94a3b8; }
.log-level { font-weight: 600; }
.log-mod { color: #64748b; }
.log-info .log-level { color: #2563eb; }
.log-warn .log-level { color: #d97706; }
.log-error .log-level { color: #dc2626; }
.log-debug .log-level { color: #6b7280; }

.app-footer {
  background: #ffffff;
  border-top: 1px solid var(--wps-border);
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  box-shadow: 0 -2px 5px rgba(0,0,0,0.02);
}

.scope-bar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.scope-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--wps-text-muted);
  flex-shrink: 0;
}

.strategy-bar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.strategy-chips {
  display: flex;
  gap: 4px;
  flex: 1;
}

.strategy-chip {
  flex: 1;
  padding: 3px 0;
  font-size: 11px;
  border-radius: var(--radius-sm);
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  text-align: center;
  transition: all 0.12s ease;
}

.strategy-chip:hover {
  background: #f1f5f9;
  color: var(--wps-text-main);
}

.strategy-chip.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
  font-weight: 600;
}

.scope-chips {
  display: flex;
  gap: 4px;
  flex: 1;
}

.scope-chip {
  flex: 1;
  padding: 3px 0;
  font-size: 11px;
  border-radius: var(--radius-sm);
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  text-align: center;
  transition: all 0.12s ease;
}

.scope-chip:hover {
  background: #f1f5f9;
  color: var(--wps-text-main);
}

.scope-chip.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
  font-weight: 600;
}

.footer-buttons {
  display: flex;
  gap: 6px;
}

.btn-footer-undo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 10px;
  height: 36px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-md);
  color: var(--wps-text-main);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-footer-undo:hover:not(:disabled) {
  background: #f8fafc;
  border-color: var(--wps-primary);
  color: var(--wps-primary);
}

.btn-footer-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 10px;
  height: 36px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: var(--radius-md);
  color: #166534;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-footer-preview:hover:not(:disabled) {
  background: #dcfce7;
  border-color: #4ade80;
}

.btn-footer-preview:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-execute {
  flex: 1;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #185adb, #1e40af);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(24, 90, 219, 0.3);
  transition: all 0.15s ease;
}

.btn-execute:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(24, 90, 219, 0.35);
}

.btn-execute:active:not(:disabled) {
  transform: translateY(0);
}

.btn-execute:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
