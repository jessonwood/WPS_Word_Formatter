<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import type { FormatChange } from '../types/planning'
import { X, Eye, Check, CheckSquare, Square, Play, ShieldAlert, Sparkles, Layers, FileText, Table, Type, ListTree } from 'lucide-vue-next'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply'): void
}>()

const store = useWordFormatterStore()

const activeCategoryFilter = ref<'all' | 'page' | 'heading' | 'body' | 'table' | 'font' | 'outline'>('all')
const searchQuery = ref('')

const plan = computed(() => store.currentPlan)
const summary = computed(() => store.currentPlan?.summary)

const filteredChanges = computed(() => {
  if (!plan.value) return []
  return plan.value.changes.filter(c => {
    // Category filter
    if (activeCategoryFilter.value !== 'all' && c.category !== activeCategoryFilter.value) {
      return false
    }
    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      const matchProp = c.propertyName.toLowerCase().includes(q)
      const matchReason = c.reason.toLowerCase().includes(q)
      const matchSnippet = (c.paragraphSnippet || '').toLowerCase().includes(q)
      const matchTarget = c.targetIndex !== undefined ? `第${c.targetIndex}段`.includes(q) : false
      return matchProp || matchReason || matchSnippet || matchTarget
    }
    return true
  })
})

const handleToggleChange = (change: FormatChange) => {
  store.setPlanChangeEnabled(change.id, !change.enabled)
}

const handleToggleAllInCurrentView = (enabled: boolean) => {
  filteredChanges.value.forEach(c => {
    store.setPlanChangeEnabled(c.id, enabled)
  })
}

const handleToggleCategory = (category: FormatChange['category'], enabled: boolean) => {
  store.setPlanCategoryEnabled(category, enabled)
}

const handleApply = () => {
  emit('apply')
}
</script>

<template>
  <div v-if="props.show" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog dryrun-dialog">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-left">
          <Eye class="w-4 h-4 text-blue-600" />
          <h3 class="modal-title">排版预计修改预览 (Dry Run)</h3>
          <span v-if="plan" class="strategy-badge" :class="`badge-${plan.strategy}`">
            {{ plan.strategy === 'minimal' ? '最小修复模式' : '完整标准化' }}
          </span>
        </div>
        <button class="btn-close" @click="emit('close')">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body -->
      <div v-if="plan && summary" class="modal-body dryrun-body">
        <!-- Summary Stats Card -->
        <div class="dryrun-summary-card">
          <div class="summary-top-row">
            <div class="total-changes-stat">
              <div class="stat-num text-blue-600">{{ summary.totalChanges }}</div>
              <div class="stat-label">预计修改项</div>
            </div>
            <div class="total-changes-stat">
              <div class="stat-num text-emerald-600">{{ summary.enabledChanges }}</div>
              <div class="stat-label">已勾选执行</div>
            </div>
            <div class="total-changes-stat">
              <div class="stat-num text-slate-600">{{ summary.affectedParagraphs }}</div>
              <div class="stat-label">受影响段落</div>
            </div>
            <div class="total-changes-stat">
              <div class="stat-num text-green-600">{{ summary.skippedAlreadyCompliant }}</div>
              <div class="stat-label">已合规段落(无需修改)</div>
            </div>
          </div>

          <!-- Category Pills Grid -->
          <div class="category-pills-row">
            <button 
              class="cat-chip" 
              :class="{ active: activeCategoryFilter === 'all' }"
              @click="activeCategoryFilter = 'all'"
            >
              全部 ({{ summary.totalChanges }})
            </button>
            <button 
              v-if="summary.pageChanges > 0"
              class="cat-chip" 
              :class="{ active: activeCategoryFilter === 'page' }"
              @click="activeCategoryFilter = 'page'"
            >
              <FileText class="w-3 h-3 inline mr-0.5" />
              页面边距 ({{ summary.pageChanges }})
            </button>
            <button 
              v-if="summary.headingChanges > 0"
              class="cat-chip" 
              :class="{ active: activeCategoryFilter === 'heading' }"
              @click="activeCategoryFilter === 'heading'"
            >
              <Layers class="w-3 h-3 inline mr-0.5" />
              标题结构 ({{ summary.headingChanges }})
            </button>
            <button 
              v-if="summary.bodyChanges > 0"
              class="cat-chip" 
              :class="{ active: activeCategoryFilter === 'body' }"
              @click="activeCategoryFilter === 'body'"
            >
              <FileText class="w-3 h-3 inline mr-0.5" />
              正文段落 ({{ summary.bodyChanges }})
            </button>
            <button 
              v-if="summary.tableChanges > 0"
              class="cat-chip" 
              :class="{ active: activeCategoryFilter === 'table' }"
              @click="activeCategoryFilter === 'table'"
            >
              <Table class="w-3 h-3 inline mr-0.5" />
              表格规范 ({{ summary.tableChanges }})
            </button>
            <button 
              v-if="summary.fontChanges > 0"
              class="cat-chip" 
              :class="{ active: activeCategoryFilter === 'font' }"
              @click="activeCategoryFilter === 'font'"
            >
              <Type class="w-3 h-3 inline mr-0.5" />
              字体字号 ({{ summary.fontChanges }})
            </button>
            <button 
              v-if="summary.outlineChanges > 0"
              class="cat-chip" 
              :class="{ active: activeCategoryFilter === 'outline' }"
              @click="activeCategoryFilter === 'outline'"
            >
              <ListTree class="w-3 h-3 inline mr-0.5" />
              大纲目录 ({{ summary.outlineChanges }})
            </button>
          </div>
        </div>

        <!-- Filter & Batch Action Bar -->
        <div class="filter-action-bar">
          <input 
            v-model="searchQuery" 
            type="text" 
            class="dryrun-search-input" 
            placeholder="搜索段落、属性或修改原因..." 
          />
          <div class="batch-action-btns">
            <button class="btn-batch-action" @click="handleToggleAllInCurrentView(true)" title="勾选当前列表全部项">
              <CheckSquare class="w-3 h-3 inline mr-0.5" /> 全选
            </button>
            <button class="btn-batch-action" @click="handleToggleAllInCurrentView(false)" title="取消当前列表全部项">
              <Square class="w-3 h-3 inline mr-0.5" /> 全消
            </button>
          </div>
        </div>

        <!-- Changes Table -->
        <div class="dryrun-table-container">
          <div v-if="filteredChanges.length === 0" class="empty-changes-box">
            <Sparkles class="w-6 h-6 text-green-500 mb-1" />
            <div class="empty-title">
              {{ summary.totalChanges === 0 ? '文档格式已 100% 符合模板规范' : '当前筛选条件下无修改项' }}
            </div>
            <div class="empty-subtitle">
              {{ summary.totalChanges === 0 ? '最小修复模式下无需对文档进行任何重复写入。' : '请尝试切换分类或清除搜索关键词。' }}
            </div>
          </div>

          <table v-else class="dryrun-table">
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">执行</th>
                <th style="width: 60px;">目标</th>
                <th>内容摘要</th>
                <th style="width: 70px;">修改属性</th>
                <th>当前值</th>
                <th>目标值</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="ch in filteredChanges" 
                :key="ch.id" 
                class="dryrun-row"
                :class="{ 'row-disabled': !ch.enabled }"
                @click="handleToggleChange(ch)"
              >
                <td style="text-align: center;" @click.stop="handleToggleChange(ch)">
                  <input type="checkbox" :checked="ch.enabled" class="checkbox-custom" />
                </td>
                <td class="target-cell">
                  <span class="target-tag">
                    {{ ch.targetType === 'section' ? '页面' : (ch.targetType === 'table' ? `表格${ch.targetIndex ?? ''}` : `第${ch.targetIndex ?? ''}段`) }}
                  </span>
                </td>
                <td class="snippet-cell" :title="ch.paragraphSnippet || ch.reason">
                  <div class="snippet-text">{{ ch.paragraphSnippet || ch.reason }}</div>
                </td>
                <td class="property-cell">
                  <span class="prop-badge">{{ ch.propertyName }}</span>
                </td>
                <td class="val-cell val-before">{{ ch.before }}</td>
                <td class="val-cell val-after">{{ ch.after }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button class="btn-cancel" @click="emit('close')">返回</button>
        <button 
          class="btn-apply-main" 
          :disabled="!summary || summary.enabledChanges === 0"
          @click="handleApply"
        >
          <Play class="w-3.5 h-3.5 inline mr-1" />
          <span>立即应用 ({{ summary?.enabledChanges ?? 0 }} 项修改)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  z-index: 1000;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.modal-dialog {
  background: #f8fafc;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  border-radius: 0;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 10px 12px;
  background: #ffffff;
  border-bottom: 1px solid var(--wps-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--wps-text-main);
  margin: 0;
}

.strategy-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 9999px;
  font-weight: 500;
}

.badge-minimal {
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.badge-normalize {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--wps-text-muted);
  cursor: pointer;
  padding: 4px;
}

.btn-close:hover {
  color: var(--wps-text-main);
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dryrun-summary-card {
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.summary-top-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  text-align: center;
}

.total-changes-stat {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 6px 2px;
}

.stat-num {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 9.5px;
  color: var(--wps-text-muted);
}

.category-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px dashed #e2e8f0;
}

.cat-chip {
  padding: 2px 8px;
  font-size: 10.5px;
  border-radius: var(--radius-sm);
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-chip:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.cat-chip.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  font-weight: 500;
}

.filter-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.dryrun-search-input {
  flex: 1;
  padding: 4px 8px;
  font-size: 11px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
}

.batch-action-btns {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-batch-action {
  padding: 3px 6px;
  font-size: 10.5px;
  border: 1px solid var(--wps-border);
  background: #ffffff;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: #475569;
}

.btn-batch-action:hover {
  background: #f8fafc;
  color: #1e293b;
}

.dryrun-table-container {
  flex: 1;
  min-height: 200px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  overflow: auto;
  background: #ffffff;
}

.empty-changes-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
}

.empty-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-top: 4px;
}

.empty-subtitle {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.dryrun-table {
  width: 100%;
  min-width: 460px;
  border-collapse: collapse;
  font-size: 11px;
}

.dryrun-table th {
  background: #f8fafc;
  padding: 6px 8px;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
  font-weight: 600;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 2;
}

.dryrun-row {
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.1s;
}

.dryrun-row:hover {
  background: #f8fafc;
}

.dryrun-row.row-disabled {
  opacity: 0.45;
  background: #fafafa;
}

.dryrun-row td {
  padding: 5px 8px;
  vertical-align: middle;
}

.checkbox-custom {
  cursor: pointer;
}

.target-tag {
  font-size: 10px;
  background: #f1f5f9;
  color: #475569;
  padding: 1px 5px;
  border-radius: 2px;
  white-space: nowrap;
}

.snippet-cell {
  max-width: 140px;
}

.snippet-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #334155;
}

.prop-badge {
  font-size: 10px;
  color: #2563eb;
  font-weight: 500;
  white-space: nowrap;
}

.val-cell {
  font-size: 10.5px;
  white-space: nowrap;
}

.val-before {
  color: #dc2626;
  text-decoration: line-through;
}

.val-after {
  color: #16a34a;
  font-weight: 500;
}

.modal-footer {
  padding: 10px 12px;
  background: #ffffff;
  border-top: 1px solid var(--wps-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.btn-cancel {
  padding: 6px 14px;
  border: 1px solid var(--wps-border);
  background: #ffffff;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 500;
  color: var(--wps-text-main);
  cursor: pointer;
  transition: all 0.12s ease;
}

.btn-cancel:hover {
  background: #f8fafc;
}

.btn-apply-main {
  padding: 6px 16px;
  border: none;
  background: linear-gradient(135deg, #185adb, #1e40af);
  color: #ffffff;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 4px rgba(24, 90, 219, 0.25);
  transition: all 0.12s ease;
}

.btn-apply-main:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
}

.btn-apply-main:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
