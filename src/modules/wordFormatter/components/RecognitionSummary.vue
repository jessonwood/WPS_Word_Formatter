<script setup lang="ts">
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-vue-next'

const store = useWordFormatterStore()

const emit = defineEmits<{
  (e: 'filter-role', role: string): void
}>()

const onFilter = (role: string) => {
  emit('filter-role', role)
}
</script>

<template>
  <div class="recognition-summary-card">
    <div class="summary-header">
      <div class="label-box">
        <Sparkles class="w-4 h-4 text-amber-500" />
        <span class="title">结构智能识别</span>
      </div>
      <div v-if="store.recognitionStats.lowConfidenceCount > 0" class="low-conf-badge" @click="onFilter('low-confidence')">
        <AlertCircle class="w-3.5 h-3.5" />
        <span>{{ store.recognitionStats.lowConfidenceCount }} 处待核对</span>
      </div>
      <div v-else class="high-conf-badge">
        <CheckCircle2 class="w-3.5 h-3.5" />
        <span>置信度良好</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-chip" @click="onFilter('main-title')">
        <span class="chip-name">主标题</span>
        <span class="chip-count" :class="{ highlight: store.recognitionStats.mainTitleCount > 0 }">
          {{ store.recognitionStats.mainTitleCount }}
        </span>
      </div>

      <div class="stat-chip" @click="onFilter('subtitle')">
        <span class="chip-name">副标题</span>
        <span class="chip-count">{{ store.recognitionStats.subtitleCount }}</span>
      </div>

      <div class="stat-chip" @click="onFilter('heading-1')">
        <span class="chip-name">一级标题</span>
        <span class="chip-count" :class="{ highlight: store.recognitionStats.heading1Count > 0 }">
          {{ store.recognitionStats.heading1Count }}
        </span>
      </div>

      <div class="stat-chip" @click="onFilter('heading-2')">
        <span class="chip-name">二级标题</span>
        <span class="chip-count" :class="{ highlight: store.recognitionStats.heading2Count > 0 }">
          {{ store.recognitionStats.heading2Count }}
        </span>
      </div>

      <div class="stat-chip" @click="onFilter('heading-3')">
        <span class="chip-name">三级标题</span>
        <span class="chip-count">{{ store.recognitionStats.heading3Count }}</span>
      </div>

      <div class="stat-chip" @click="onFilter('heading-4')">
        <span class="chip-name">四级标题</span>
        <span class="chip-count">{{ store.recognitionStats.heading4Count }}</span>
      </div>

      <div class="stat-chip" @click="onFilter('body')">
        <span class="chip-name">正文段落</span>
        <span class="chip-count">{{ store.recognitionStats.bodyCount }}</span>
      </div>

      <div class="stat-chip" @click="onFilter('table')">
        <span class="chip-name">表格/图表</span>
        <span class="chip-count">{{ store.recognitionStats.tableCount + store.recognitionStats.tableCaptionCount + store.recognitionStats.figureCaptionCount }}</span>
      </div>

      <div class="stat-chip" @click="onFilter('attachment')">
        <span class="chip-name">附件标识</span>
        <span class="chip-count">{{ store.recognitionStats.attachmentCount }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recognition-summary-card {
  background: var(--wps-card-bg);
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.label-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title {
  font-weight: 600;
  font-size: 13px;
  color: var(--wps-text-main);
}

.low-conf-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--wps-warning-light);
  border: 1px solid #fde68a;
  border-radius: var(--radius-sm);
  color: #b45309;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.high-conf-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--wps-success-light);
  border: 1px solid #a7f3d0;
  border-radius: var(--radius-sm);
  color: var(--wps-success);
  font-size: 11px;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.stat-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #f8fafc;
  border: 1px solid var(--wps-border-subtle);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.stat-chip:hover {
  background: #f1f5f9;
  border-color: var(--wps-primary);
}

.chip-name {
  font-size: 11px;
  color: var(--wps-text-muted);
}

.chip-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--wps-text-main);
}

.chip-count.highlight {
  color: var(--wps-primary);
}
</style>
