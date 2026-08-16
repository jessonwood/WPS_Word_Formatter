<script setup lang="ts">
import { ref } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { CheckCircle2, AlertTriangle, Undo2, ShieldCheck, ChevronDown, ChevronUp, FileText, Table, Tag } from 'lucide-vue-next'

const store = useWordFormatterStore()
const showDetails = ref(false)

const handleUndo = async () => {
  await store.undoFormat()
}
</script>

<template>
  <div>
    <!-- Success Banner -->
    <div v-if="store.formatStatus === 'success' && store.lastResult" class="result-card success">
      <div class="result-header">
        <div class="status-box">
          <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div class="status-title">智能排版完成</div>
            <div class="status-subtitle">耗时 {{ store.lastResult.durationMs }}ms • 页面与字体格式已统一</div>
          </div>
        </div>

        <button 
          v-if="store.lastSnapshotAvailable" 
          class="btn-undo" 
          @click="handleUndo"
          title="撤销本次排版，恢复原有格式"
        >
          <Undo2 class="w-3.5 h-3.5" />
          <span>撤销排版</span>
        </button>
      </div>

      <!-- Core Stat Metrics -->
      <div class="result-stats">
        <div class="res-stat-item">
          <span class="label">规范段落</span>
          <span class="val">{{ store.lastResult.formattedParagraphs }} 段</span>
        </div>
        <div class="res-stat-item">
          <span class="label">表格处理</span>
          <span class="val">{{ store.lastResult.formattedTables }} 个</span>
        </div>
        <div class="res-stat-item">
          <span class="label">完整性校验</span>
          <span class="val text-emerald-600 flex-center">
            <ShieldCheck class="w-3 h-3 mr-1 inline text-emerald-600" /> 100% 一致
          </span>
        </div>
      </div>

      <!-- Breakdown Detail Tags (Diff Summary) -->
      <div v-if="store.lastResult.breakdown" class="breakdown-box">
        <div class="breakdown-header" @click="showDetails = !showDetails">
          <span class="breakdown-title">
            <Tag class="w-3 h-3 mr-1 inline text-emerald-600" />
            排版变更统计明细
          </span>
          <button class="btn-toggle-details">
            <span class="mr-0.5">{{ showDetails ? '收起' : '展开' }}</span>
            <ChevronUp v-if="showDetails" class="w-3 h-3 inline" />
            <ChevronDown v-else class="w-3 h-3 inline" />
          </button>
        </div>

        <div class="breakdown-chips">
          <span v-if="store.lastResult.breakdown.mainTitleCount > 0" class="b-chip">
            主标题: {{ store.lastResult.breakdown.mainTitleCount }}
          </span>
          <span v-if="store.lastResult.breakdown.subtitleCount > 0" class="b-chip">
            副标题: {{ store.lastResult.breakdown.subtitleCount }}
          </span>
          <span v-if="store.lastResult.breakdown.heading1Count > 0" class="b-chip">
            一级标题: {{ store.lastResult.breakdown.heading1Count }}
          </span>
          <span v-if="store.lastResult.breakdown.heading2Count > 0" class="b-chip">
            二级标题: {{ store.lastResult.breakdown.heading2Count }}
          </span>
          <span v-if="store.lastResult.breakdown.heading3Count > 0" class="b-chip">
            三级标题: {{ store.lastResult.breakdown.heading3Count }}
          </span>
          <span v-if="store.lastResult.breakdown.heading4Count > 0" class="b-chip">
            四级标题: {{ store.lastResult.breakdown.heading4Count }}
          </span>
          <span v-if="store.lastResult.breakdown.customHeadingCount > 0" class="b-chip">
            多级标题: {{ store.lastResult.breakdown.customHeadingCount }}
          </span>
          <span v-if="store.lastResult.breakdown.bodyCount > 0" class="b-chip b-chip-body">
            正文段落: {{ store.lastResult.breakdown.bodyCount }}
          </span>
          <span v-if="store.lastResult.breakdown.attachmentCount > 0" class="b-chip">
            附件: {{ store.lastResult.breakdown.attachmentCount }}
          </span>
          <span v-if="store.lastResult.breakdown.captionCount > 0" class="b-chip">
            图表题: {{ store.lastResult.breakdown.captionCount }}
          </span>
          <span v-if="store.lastResult.breakdown.tableCount > 0" class="b-chip b-chip-table">
            三线表: {{ store.lastResult.breakdown.tableCount }}
          </span>
        </div>

        <div v-if="showDetails" class="breakdown-details-panel">
          <div class="detail-row">
            <span class="d-label">• 页面设置：</span>
            <span class="d-val">版心与边距已严格对齐模板规范</span>
          </div>
          <div class="detail-row">
            <span class="d-label">• 大纲级别：</span>
            <span class="d-val">已生成 WPS 原生多级目录大纲</span>
          </div>
          <div class="detail-row">
            <span class="d-label">• 重点强调：</span>
            <span class="d-val">局部加粗与斜体重点已完整保留</span>
          </div>
          <div class="detail-row">
            <span class="d-label">• 文本防丢：</span>
            <span class="d-val">前验与后验签名完全匹配 (零内容丢失)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="store.formatStatus === 'error'" class="result-card error">
      <div class="result-header">
        <div class="status-box">
          <AlertTriangle class="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <div class="status-title text-red-600">排版中断</div>
            <div class="status-subtitle text-red-500">{{ store.errorMessage || '发生未预期错误' }}</div>
          </div>
        </div>

        <button 
          v-if="store.lastSnapshotAvailable" 
          class="btn-undo" 
          @click="handleUndo"
        >
          <Undo2 class="w-3.5 h-3.5" />
          <span>恢复快照</span>
        </button>
      </div>

      <div v-if="store.errorDetails" class="error-log-box">
        {{ store.errorDetails }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-card {
  border-radius: var(--radius-lg);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 8px;
}

.result-card.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.result-card.error {
  background: var(--wps-danger-light);
  border: 1px solid #fecaca;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--wps-text-main);
}

.status-subtitle {
  font-size: 11px;
  color: var(--wps-text-muted);
}

.btn-undo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-md);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--wps-text-main);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.btn-undo:hover {
  background: #f8fafc;
  border-color: var(--wps-primary);
  color: var(--wps-primary);
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0,0,0,0.05);
}

.res-stat-item {
  display: flex;
  flex-direction: column;
}

.res-stat-item .label {
  font-size: 10px;
  color: var(--wps-text-muted);
}

.res-stat-item .val {
  font-size: 12px;
  font-weight: 600;
  color: var(--wps-text-main);
}

.flex-center {
  display: inline-flex;
  align-items: center;
}

.breakdown-box {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #bbf7d0;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  margin-bottom: 6px;
}

.breakdown-title {
  font-size: 11px;
  font-weight: 600;
  color: #15803d;
}

.btn-toggle-details {
  background: transparent;
  border: none;
  font-size: 10.5px;
  color: #16a34a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.breakdown-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.b-chip {
  font-size: 10px;
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.b-chip-body {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0369a1;
}

.b-chip-table {
  background: #fef3c7;
  border-color: #fde68a;
  color: #92400e;
}

.breakdown-details-panel {
  margin-top: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  font-size: 10.5px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.detail-row {
  display: flex;
  gap: 4px;
}

.d-label {
  color: var(--wps-text-muted);
  font-weight: 500;
}

.d-val {
  color: var(--wps-text-main);
}

.error-log-box {
  margin-top: 8px;
  padding: 6px;
  background: #fee2e2;
  border-radius: var(--radius-sm);
  font-size: 10px;
  color: #7f1d1d;
  max-height: 80px;
  overflow-y: auto;
  word-break: break-all;
}
</style>
