<script setup lang="ts">
import { ref } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Wand2 } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'open-cleanup'): void
}>()

const store = useWordFormatterStore()
const expanded = ref(false)

function locateParagraph(idx?: number) {
  if (idx !== undefined) {
    store.selectParagraphInDoc(idx)
  }
}
</script>

<template>
  <div v-if="store.auditReport" class="audit-card">
    <div class="audit-header" @click="expanded = !expanded">
      <div class="score-badge-area">
        <div 
          class="score-circle"
          :class="{
            'score-perfect': store.auditReport.score >= 95,
            'score-good': store.auditReport.score >= 80 && store.auditReport.score < 95,
            'score-warn': store.auditReport.score < 80
          }"
        >
          <span class="score-num">{{ store.auditReport.score }}</span>
          <span class="score-unit">分</span>
        </div>
        <div class="audit-info">
          <div class="audit-title">
            <span>文档规范与结构体检</span>
            <span 
              class="grade-tag"
              :class="{
                'tag-perfect': store.auditReport.score >= 95,
                'tag-good': store.auditReport.score >= 80 && store.auditReport.score < 95,
                'tag-warn': store.auditReport.score < 80
              }"
            >
              {{ store.auditReport.score >= 95 ? '规范卓越' : (store.auditReport.score >= 80 ? '良好待排' : '急需规范') }}
            </span>
          </div>
          <div class="audit-desc">
            <span v-if="store.auditReport.totalIssues === 0">
              <CheckCircle2 class="w-3 h-3 inline text-emerald-600 mr-0.5" /> 暂未发现明显格式或结构缺陷
            </span>
            <span v-else>
              <AlertCircle class="w-3 h-3 inline text-amber-600 mr-0.5" />
              发现 {{ store.auditReport.totalIssues }} 处待优化项
              <span v-if="store.cleanupIssues.length > 0">（含 {{ store.cleanupIssues.length }} 个清理项）</span>
            </span>
          </div>
        </div>
      </div>

      <div class="header-actions" @click.stop>
        <button
          v-if="store.cleanupIssues.length > 0"
          class="btn-cleanup-badge"
          @click="emit('open-cleanup')"
          title="打开文档清理与格式净化面板"
        >
          <span>🧹 文档清理</span>
          <span class="badge-num">{{ store.cleanupIssues.length }}</span>
        </button>

        <button class="btn-toggle" @click="expanded = !expanded">
          <span class="text-xs mr-0.5">{{ expanded ? '收起' : '体检详情' }}</span>
          <ChevronUp v-if="expanded" class="w-3.5 h-3.5 inline" />
          <ChevronDown v-else class="w-3.5 h-3.5 inline" />
        </button>
      </div>
    </div>

    <!-- Expandable 7-Dimension Score & Structure Details -->
    <div v-if="expanded" class="audit-details-panel">
      <!-- 7-Dimension Health Score Grid -->
      <div v-if="store.auditReport.healthScore" class="health-grid">
        <div class="health-dim">
          <div class="dim-label">格式规范 (35%)</div>
          <div class="dim-bar-wrap">
            <div class="dim-bar" :style="{ width: `${store.auditReport.healthScore.formatting}%` }"></div>
          </div>
          <div class="dim-score">{{ store.auditReport.healthScore.formatting }}分</div>
        </div>
        <div class="health-dim">
          <div class="dim-label">结构完整 (25%)</div>
          <div class="dim-bar-wrap">
            <div class="dim-bar" :style="{ width: `${store.auditReport.healthScore.structure}%` }"></div>
          </div>
          <div class="dim-score">{{ store.auditReport.healthScore.structure }}分</div>
        </div>
        <div class="health-dim">
          <div class="dim-label">标题体系 (15%)</div>
          <div class="dim-bar-wrap">
            <div class="dim-bar" :style="{ width: `${store.auditReport.healthScore.headings}%` }"></div>
          </div>
          <div class="dim-score">{{ store.auditReport.healthScore.headings }}分</div>
        </div>
        <div class="health-dim">
          <div class="dim-label">表格规范 (10%)</div>
          <div class="dim-bar-wrap">
            <div class="dim-bar" :style="{ width: `${store.auditReport.healthScore.tables}%` }"></div>
          </div>
          <div class="dim-score">{{ store.auditReport.healthScore.tables }}分</div>
        </div>
        <div class="health-dim">
          <div class="dim-label">页面设置 (10%)</div>
          <div class="dim-bar-wrap">
            <div class="dim-bar" :style="{ width: `${store.auditReport.healthScore.pageLayout}%` }"></div>
          </div>
          <div class="dim-score">{{ store.auditReport.healthScore.pageLayout }}分</div>
        </div>
        <div class="health-dim">
          <div class="dim-label">文档清洁 (5%)</div>
          <div class="dim-bar-wrap">
            <div class="dim-bar" :style="{ width: `${store.auditReport.healthScore.cleanup}%` }"></div>
          </div>
          <div class="dim-score">{{ store.auditReport.healthScore.cleanup }}分</div>
        </div>
      </div>

      <!-- Structure Diagnostic Issues List -->
      <div v-if="store.auditReport.structureIssues && store.auditReport.structureIssues.length > 0" class="section-block">
        <div class="block-title">🏗️ 结构诊断缺陷 ({{ store.auditReport.structureIssues.length }})</div>
        <div class="issue-list-grid">
          <div
            v-for="sIssue in store.auditReport.structureIssues"
            :key="sIssue.id"
            class="struct-issue-item"
            :class="`issue-${sIssue.severity}`"
            @click="locateParagraph(sIssue.paragraphIndex)"
            title="点击选中文档对应段落"
          >
            <div class="struct-issue-top">
              <span class="struct-issue-title">{{ sIssue.title }}</span>
              <span v-if="sIssue.paragraphIndex" class="struct-issue-p">📍 第 {{ sIssue.paragraphIndex }} 段</span>
            </div>
            <div class="struct-issue-desc">{{ sIssue.description }}</div>
          </div>
        </div>
      </div>

      <!-- Formatting Issues List -->
      <div v-if="store.auditReport.issues && store.auditReport.issues.length > 0" class="section-block">
        <div class="block-title">📐 格式规范待修复 ({{ store.auditReport.issues.length }})</div>
        <div class="audit-issues-list">
          <div 
            v-for="issue in store.auditReport.issues" 
            :key="issue.id"
            class="issue-item"
            :class="`issue-${issue.severity}`"
          >
            <div class="issue-main">
              <span class="issue-badge">{{ issue.title }}</span>
              <span class="issue-text">{{ issue.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audit-card {
  background: var(--wps-card-bg);
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-lg);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 8px;
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.score-badge-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-weight: 700;
  border: 2px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  flex-shrink: 0;
  padding-top: 8px;
}

.score-num {
  font-size: 17px;
  line-height: 1;
}

.score-unit {
  font-size: 10px;
}

.score-perfect {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #15803d;
}

.score-good {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.score-warn {
  background: #fffbeb;
  border-color: #f59e0b;
  color: #b45309;
}

.audit-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.audit-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--wps-text-main);
}

.grade-tag {
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.tag-perfect { background: #dcfce7; color: #166534; }
.tag-good { background: #dbeafe; color: #1e40af; }
.tag-warn { background: #fef3c7; color: #92400e; }

.audit-desc {
  font-size: 11px;
  color: var(--wps-text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-cleanup-badge {
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid #fed7aa;
  background: #fff7ed;
  color: #c2410c;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.btn-cleanup-badge:hover {
  background: #ffedd5;
  border-color: #fdba74;
}

.badge-num {
  background: #ea580c;
  color: #ffffff;
  padding: 0 5px;
  border-radius: 10px;
  font-size: 10px;
}

.btn-toggle {
  background: transparent;
  border: none;
  color: var(--wps-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.btn-toggle:hover {
  color: var(--wps-primary);
}

.audit-details-panel {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--wps-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: #f8fafc;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.health-dim {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dim-label {
  font-size: 10px;
  color: #64748b;
}

.dim-bar-wrap {
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.dim-bar {
  height: 100%;
  background: #2563eb;
  border-radius: 2px;
}

.dim-score {
  font-size: 10.5px;
  font-weight: 700;
  color: #334155;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.block-title {
  font-size: 11.5px;
  font-weight: 600;
  color: #334155;
}

.issue-list-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.struct-issue-item {
  padding: 6px 8px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.15s;
}

.struct-issue-item:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.struct-issue-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.struct-issue-title {
  font-size: 11.5px;
  font-weight: 600;
  color: #0f172a;
}

.struct-issue-p {
  font-size: 10.5px;
  color: #2563eb;
}

.struct-issue-desc {
  font-size: 10.5px;
  color: #64748b;
  margin-top: 2px;
}

.issue-item {
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  background: #f8fafc;
  font-size: 10.5px;
  border-left: 3px solid #94a3b8;
}

.issue-high, .issue-error {
  border-left-color: #ef4444;
}

.issue-medium, .issue-warning {
  border-left-color: #f59e0b;
}

.issue-low, .issue-info {
  border-left-color: #3b82f6;
}

.issue-main {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.issue-badge {
  font-weight: 600;
  color: var(--wps-text-main);
}

.issue-text {
  color: var(--wps-text-muted);
}
</style>
