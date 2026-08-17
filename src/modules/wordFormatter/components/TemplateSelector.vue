<script setup lang="ts">
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { BookmarkCheck, SlidersHorizontal, Sparkles, FileDown } from 'lucide-vue-next'
import { formatFontSize } from '@/shared/utils/fontUtils'

const store = useWordFormatterStore()
const emit = defineEmits<{
  (e: 'open-editor'): void
}>()

const handleExtractTemplate = () => {
  const tpl = store.extractTemplateFromCurrentDocument()
  if (tpl) emit('open-editor')
}

const onSelectChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  store.setSelectedTemplate(target.value)
}
</script>

<template>
  <div class="template-card">
    <div class="template-header">
      <div class="label-box">
        <BookmarkCheck class="w-4 h-4 text-indigo-600" />
        <span class="title">排版模板</span>
      </div>
      <div class="template-actions">
        <button class="btn-config" @click="handleExtractTemplate" title="从当前文档已识别的格式生成一个自定义模板">
          <FileDown class="w-3.5 h-3.5" />
          <span>提取模板</span>
        </button>
        <button class="btn-config" @click="emit('open-editor')" title="自定义与管理模板参数">
          <SlidersHorizontal class="w-3.5 h-3.5" />
          <span>模板详情</span>
        </button>
      </div>
    </div>

    <div v-if="store.templateRecommendation" class="recommend-box">
      <div class="recommend-main">
        <Sparkles class="w-4 h-4 text-amber-500" />
        <div>
          <div class="recommend-title">推荐：{{ store.templateRecommendation.templateName }}</div>
          <div class="recommend-reason">{{ store.templateRecommendation.reasons.join(' · ') }}</div>
        </div>
      </div>
      <button
        v-if="store.selectedTemplateId !== store.templateRecommendation.templateId"
        class="btn-use-recommend"
        @click="store.applyRecommendedTemplate()"
      >使用推荐</button>
      <span v-else class="recommend-used">已使用</span>
    </div>

    <div class="select-wrapper">
      <select 
        class="custom-select" 
        :value="store.selectedTemplateId" 
        @change="onSelectChange"
      >
        <option 
          v-for="tpl in store.allTemplates" 
          :key="tpl.id" 
          :value="tpl.id"
        >
          {{ tpl.name }} {{ tpl.isBuiltIn ? '（内置）' : '（自定义）' }}
        </option>
      </select>
    </div>

    <div v-if="store.selectedTemplate" class="template-desc">
      {{ store.selectedTemplate.description || '标准排版格式' }}
    </div>

    <div class="specs-grid">
      <div class="spec-item">
        <span class="spec-label">主标题</span>
        <span class="spec-value">{{ store.selectedTemplate.mainTitle.chineseFont }} {{ formatFontSize(store.selectedTemplate.mainTitle.fontSizePt) }}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">一级标题</span>
        <span class="spec-value">{{ store.selectedTemplate.heading1.chineseFont }} {{ formatFontSize(store.selectedTemplate.heading1.fontSizePt) }}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">正文</span>
        <span class="spec-value">{{ store.selectedTemplate.body.chineseFont }} {{ formatFontSize(store.selectedTemplate.body.fontSizePt) }}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">正文行距</span>
        <span class="spec-value">固定 {{ store.selectedTemplate.body.lineSpacingPt }}pt</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-card {
  background: var(--wps-card-bg);
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
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

.btn-config {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #f8fafc;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--wps-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-config:hover {
  background: #f1f5f9;
  color: var(--wps-primary);
  border-color: #cbd5e1;
}

.select-wrapper {
  margin-bottom: 8px;
}

.custom-select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  background-color: #ffffff;
  color: var(--wps-text-main);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease;
}

.custom-select:focus {
  border-color: var(--wps-primary);
  box-shadow: 0 0 0 2px var(--wps-primary-light);
}

.template-desc {
  font-size: 11px;
  color: var(--wps-text-muted);
  line-height: 1.4;
  margin-bottom: 8px;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  background: #f8fafc;
  padding: 8px;
  border-radius: var(--radius-md);
}

.spec-item {
  display: flex;
  flex-direction: column;
}

.spec-label {
  font-size: 10px;
  color: var(--wps-text-light);
}

.spec-value {
  font-size: 11px;
  font-weight: 500;
  color: var(--wps-text-main);
}
</style>

<style scoped>
.template-actions { display:flex; gap:6px; }
.recommend-box { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; margin-bottom:8px; border:1px solid #fde68a; background:#fffbeb; border-radius:8px; }
.recommend-main { display:flex; align-items:flex-start; gap:6px; min-width:0; }
.recommend-title { font-size:11.5px; font-weight:700; color:#92400e; }
.recommend-reason { font-size:10px; color:#a16207; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:420px; }
.btn-use-recommend { flex-shrink:0; border:1px solid #f59e0b; background:#fff; color:#b45309; border-radius:6px; padding:4px 8px; font-size:10.5px; cursor:pointer; }
.recommend-used { flex-shrink:0; color:#15803d; font-size:10.5px; font-weight:600; }
</style>
