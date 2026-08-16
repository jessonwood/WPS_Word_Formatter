<template>
  <div v-if="visible" class="cleanup-modal-overlay" @click.self="handleClose">
    <div class="cleanup-modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="header-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <h2 class="modal-title">文档清理与格式净化</h2>
            <p class="modal-subtitle">扫描并消除多余空格、空行、Tab 缩进与异常分节，纯净排版底稿</p>
          </div>
        </div>
        <button class="btn-close" @click="handleClose" title="关闭">✕</button>
      </div>

      <!-- Category Filter Pills & Summary -->
      <div class="category-summary-bar">
        <div class="category-pills">
          <button
            class="category-pill"
            :class="{ active: selectedCategory === 'all' }"
            @click="selectedCategory = 'all'"
          >
            全部问题 ({{ issues.length }})
          </button>
          <button
            v-for="cat in categories"
            :key="cat.type"
            class="category-pill"
            :class="{ active: selectedCategory === cat.type }"
            @click="selectedCategory = cat.type"
          >
            {{ cat.name }} ({{ cat.count }})
          </button>
        </div>

        <div class="batch-actions">
          <button class="btn-batch btn-safe" @click="selectAllSafe" title="一键勾选所有低风险安全项">
            ⚡ 全选安全项 ({{ safeIssuesCount }})
          </button>
          <button class="btn-batch" @click="toggleSelectAll">
            {{ isAllSelected ? '取消全选' : '全部全选' }}
          </button>
        </div>
      </div>

      <!-- Issue List Content Area -->
      <div class="modal-body">
        <div v-if="filteredIssues.length === 0" class="empty-state">
          <div class="empty-icon">✓</div>
          <p class="empty-text">太棒了！当前分类下未发现任何格式杂质或冗余空格。</p>
        </div>

        <div v-else class="issue-list">
          <div
            v-for="issue in filteredIssues"
            :key="issue.id"
            class="issue-card"
            :class="{ 'is-disabled': !issue.enabled, 'is-warning': issue.severity === 'warning' }"
          >
            <div class="issue-card-header">
              <label class="issue-checkbox-label">
                <input
                  type="checkbox"
                  class="issue-checkbox"
                  v-model="issue.enabled"
                />
                <span class="issue-type-badge" :class="issue.type">
                  {{ getCategoryName(issue.type) }}
                </span>
                <span class="issue-location-btn" @click.stop="locateParagraph(issue.paragraphIndex)" title="点击在文档中定位选定段落">
                  📍 第 {{ issue.paragraphIndex }} 段
                </span>
              </label>

              <div class="issue-tags">
                <span v-if="issue.safeAutoFix" class="tag-safe">可安全修复</span>
                <span v-else class="tag-review">需人工确认</span>
                <span class="tag-severity" :class="issue.severity">{{ issue.severity }}</span>
              </div>
            </div>

            <div class="issue-reason">{{ issue.reason }}</div>

            <!-- Diff Preview -->
            <div v-if="issue.originalText || issue.suggestedText" class="diff-container">
              <div class="diff-row diff-before" v-if="issue.originalText">
                <span class="diff-label">原文:</span>
                <span class="diff-text-content raw-text">{{ formatSnippet(issue.originalText) }}</span>
              </div>
              <div class="diff-row diff-after" v-if="issue.suggestedText !== undefined">
                <span class="diff-label">建议:</span>
                <span class="diff-text-content fixed-text">
                  {{ issue.suggestedText === '' ? '[删除该段/行]' : formatSnippet(issue.suggestedText) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <div class="footer-summary">
          <span>已勾选 <strong>{{ enabledIssuesCount }}</strong> / {{ issues.length }} 个清理项</span>
          <span v-if="hasUnsafeSelected" class="unsafe-tip">（含 {{ unsafeSelectedCount }} 项需确认项）</span>
        </div>

        <div class="footer-actions">
          <button class="btn btn-secondary" @click="handleClose" :disabled="executing">取消</button>
          <button
            class="btn btn-primary btn-cleanup-exec"
            :disabled="enabledIssuesCount === 0 || executing"
            @click="handleExecute"
          >
            <span v-if="executing" class="spinner"></span>
            <span>{{ executing ? '正在清理执行...' : `执行清理 (${enabledIssuesCount} 项)` }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CleanupIssue, CleanupCategorySummary, CleanupIssueType } from '../types/cleanup'
import type { WriterAdapter } from '../adapters/WriterAdapter'

const props = defineProps<{
  visible: boolean
  issues: CleanupIssue[]
  categories: CleanupCategorySummary[]
  adapter: WriterAdapter
  executing?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'execute', issues: CleanupIssue[]): void
  (e: 'locate', paragraphIndex: number): void
}>()

const selectedCategory = ref<string>('all')

const filteredIssues = computed(() => {
  if (selectedCategory.value === 'all') {
    return props.issues
  }
  return props.issues.filter(i => i.type === selectedCategory.value)
})

const enabledIssuesCount = computed(() => props.issues.filter(i => i.enabled).length)
const safeIssuesCount = computed(() => props.issues.filter(i => i.safeAutoFix).length)
const isAllSelected = computed(() => props.issues.length > 0 && enabledIssuesCount.value === props.issues.length)

const unsafeSelectedCount = computed(() => {
  return props.issues.filter(i => i.enabled && !i.safeAutoFix).length
})
const hasUnsafeSelected = computed(() => unsafeSelectedCount.value > 0)

function getCategoryName(type: CleanupIssueType): string {
  const map: Record<string, string> = {
    'blank-line': '多余空行',
    'multiple-blank-lines': '连续空行',
    'multiple-spaces': '多余空格',
    'trailing-spaces': '段尾空格',
    'leading-spaces': '段首手工空格',
    'tab-indent': 'Tab 缩进',
    'manual-line-break': '软回车换行',
    'duplicate-page-break': '重复分页符',
    'duplicate-section-break': '异常分节符',
    'empty-paragraph-before-table': '表格前空段',
    'empty-paragraph-after-table': '表格后空段'
  }
  return map[type] || type
}

function selectAllSafe() {
  for (const issue of props.issues) {
    issue.enabled = issue.safeAutoFix
  }
}

function toggleSelectAll() {
  const target = !isAllSelected.value
  for (const issue of props.issues) {
    issue.enabled = target
  }
}

function locateParagraph(idx?: number) {
  if (idx !== undefined) {
    emit('locate', idx)
  }
}

function formatSnippet(text: string): string {
  if (!text) return ''
  return text.replace(/\r/g, '↵').replace(/\n/g, '↵').replace(/\t/g, '⇥')
}

function handleClose() {
  if (!props.executing) {
    emit('close')
  }
}

function handleExecute() {
  emit('execute', props.issues)
}
</script>

<style scoped>
.cleanup-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.cleanup-modal-card {
  background: #ffffff;
  width: 900px;
  max-width: 95vw;
  max-height: 90vh;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPopIn {
  from {
    transform: scale(0.96);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #e0f2fe;
  color: #0284c7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.modal-subtitle {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #94a3b8;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.15s;
}

.btn-close:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.category-summary-bar {
  padding: 12px 24px;
  border-bottom: 1px solid #edf2f7;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-pill {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}

.category-pill:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.category-pill.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  font-weight: 600;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.btn-batch {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-batch:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.btn-batch.btn-safe {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
  font-weight: 600;
}

.btn-batch.btn-safe:hover {
  background: #d1fae5;
}

.modal-body {
  padding: 16px 24px;
  overflow-y: auto;
  flex: 1;
  background: #f8fafc;
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 32px;
  color: #10b981;
  margin-bottom: 8px;
}

.issue-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.issue-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
  transition: all 0.15s;
}

.issue-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.issue-card.is-disabled {
  opacity: 0.65;
  background: #fdfdfd;
}

.issue-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.issue-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.issue-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #2563eb;
}

.issue-type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: #e2e8f0;
  color: #334155;
}

.issue-type-badge.multiple-spaces { background: #fef3c7; color: #b45309; }
.issue-type-badge.tab-indent { background: #e0e7ff; color: #4338ca; }
.issue-type-badge.leading-spaces { background: #fae8ff; color: #86198f; }
.issue-type-badge.trailing-spaces { background: #f1f5f9; color: #475569; }
.issue-type-badge.blank-line { background: #fee2e2; color: #b91c1c; }
.issue-type-badge.multiple-blank-lines { background: #fee2e2; color: #b91c1c; }
.issue-type-badge.manual-line-break { background: #ffedd5; color: #c2410c; }

.issue-location-btn {
  font-size: 12px;
  color: #2563eb;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.issue-location-btn:hover {
  background: #dbeafe;
  text-decoration: underline;
}

.issue-tags {
  display: flex;
  gap: 6px;
  align-items: center;
}

.tag-safe {
  font-size: 11px;
  color: #059669;
  background: #ecfdf5;
  padding: 2px 6px;
  border-radius: 4px;
}

.tag-review {
  font-size: 11px;
  color: #d97706;
  background: #fffbeb;
  padding: 2px 6px;
  border-radius: 4px;
}

.tag-severity {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
}

.tag-severity.info { background: #f1f5f9; color: #64748b; }
.tag-severity.warning { background: #fef3c7; color: #b45309; }
.tag-severity.error { background: #fee2e2; color: #b91c1c; }

.issue-reason {
  margin: 6px 0 8px 24px;
  font-size: 13px;
  color: #334155;
}

.diff-container {
  margin-left: 24px;
  background: #f8fafc;
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: Consolas, Menlo, Monaco, monospace;
  font-size: 12px;
}

.diff-row {
  display: flex;
  gap: 8px;
}

.diff-label {
  color: #64748b;
  width: 36px;
  flex-shrink: 0;
}

.diff-before .diff-text-content {
  color: #dc2626;
  background: #fef2f2;
  padding: 1px 4px;
  border-radius: 3px;
}

.diff-after .diff-text-content {
  color: #16a34a;
  background: #f0fdf4;
  padding: 1px 4px;
  border-radius: 3px;
}

.modal-footer {
  padding: 14px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
}

.footer-summary {
  font-size: 13px;
  color: #475569;
}

.unsafe-tip {
  color: #d97706;
  font-size: 12px;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary {
  background: #f1f5f9;
  color: #334155;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
