<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import type { ParagraphRole } from '../types/recognition'
import { Search, RotateCcw, Eye, ChevronDown, ChevronRight, HelpCircle, X } from 'lucide-vue-next'

const store = useWordFormatterStore()

const currentFilter = ref<string>('all')
const searchText = ref<string>('')
const expandedReasons = ref<Record<number, boolean>>({})

const roleOptions: Array<{ value: ParagraphRole; label: string }> = [
  { value: 'main-title', label: '主标题' },
  { value: 'subtitle', label: '副标题' },
  { value: 'heading-1', label: '一级标题' },
  { value: 'heading-2', label: '二级标题' },
  { value: 'heading-3', label: '三级标题' },
  { value: 'heading-4', label: '四级标题' },
  { value: 'heading-5', label: '五级标题' },
  { value: 'heading-6', label: '六级标题' },
  { value: 'body', label: '正文' },
  { value: 'attachment-marker', label: '附件标识' },
  { value: 'attachment-title', label: '附件条目' },
  { value: 'table-caption', label: '表格标题' },
  { value: 'figure-caption', label: '图片标题' },
  { value: 'blank', label: '空行' }
]

const filteredResults = computed(() => {
  return store.effectiveRecognition.filter(item => {
    // Role filter
    if (currentFilter.value === 'low-confidence') {
      if (item.confidence >= 0.70) return false
    } else if (currentFilter.value === 'overridden') {
      if (!item.userOverridden) return false
    } else if (currentFilter.value === 'headings') {
      if (!['main-title', 'subtitle', 'heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6'].includes(item.role)) return false
    } else if (currentFilter.value === 'body') {
      if (item.role !== 'body') return false
    } else if (currentFilter.value === 'table') {
      if (item.role !== 'table-caption' && item.role !== 'figure-caption') return false
    } else if (currentFilter.value === 'attachment') {
      if (item.role !== 'attachment-marker' && item.role !== 'attachment-title') return false
    } else if (currentFilter.value !== 'all') {
      if (item.role !== currentFilter.value) return false
    }

    // Text search filter
    if (searchText.value.trim()) {
      const q = searchText.value.trim().toLowerCase()
      return item.originalText.toLowerCase().includes(q)
    }

    return true
  })
})

const onRoleChange = (paragraphIndex: number, event: Event) => {
  const target = event.target as HTMLSelectElement
  store.setUserOverride(paragraphIndex, target.value as ParagraphRole)
}

const toggleReason = (index: number) => {
  expandedReasons.value[index] = !expandedReasons.value[index]
}

const onRowClick = (paragraphIndex: number) => {
  store.selectParagraphInDoc(paragraphIndex)
}

const clearSearch = () => {
  searchText.value = ''
}

defineExpose({
  setFilter: (filter: string) => {
    currentFilter.value = filter
  }
})
</script>

<template>
  <div class="recognition-table-container">
    <!-- Compact Toolbar -->
    <div class="toolbar-card">
      <div class="search-row">
        <div class="search-box">
          <Search class="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input 
            v-model="searchText" 
            type="text" 
            placeholder="搜索段落关键词..." 
            class="search-input"
          />
          <button v-if="searchText" class="btn-clear-search" @click="clearSearch">
            <X class="w-3 h-3 text-slate-400" />
          </button>
        </div>

        <select v-model="currentFilter" class="filter-dropdown">
          <option value="all">全部类型 ({{ store.effectiveRecognition.length }})</option>
          <option value="headings">所有标题</option>
          <option value="body">正文段落 ({{ store.recognitionStats.bodyCount }})</option>
          <option value="low-confidence">待核对 (&lt;70%) ({{ store.recognitionStats.lowConfidenceCount }})</option>
          <option value="overridden">已手动指定</option>
          <option value="attachment">附件 ({{ store.recognitionStats.attachmentCount }})</option>
          <option value="table">图表标题</option>
        </select>
      </div>

      <!-- Quick Category Filter Chips -->
      <div class="filter-chips">
        <button 
          class="chip-btn" 
          :class="{ active: currentFilter === 'all' }"
          @click="currentFilter = 'all'"
        >
          全部 ({{ store.effectiveRecognition.length }})
        </button>
        <button 
          class="chip-btn" 
          :class="{ active: currentFilter === 'headings' }"
          @click="currentFilter = 'headings'"
        >
          标题 ({{ store.recognitionStats.heading1Count + store.recognitionStats.heading2Count + store.recognitionStats.heading3Count + store.recognitionStats.mainTitleCount }})
        </button>
        <button 
          class="chip-btn" 
          :class="{ active: currentFilter === 'body' }"
          @click="currentFilter = 'body'"
        >
          正文 ({{ store.recognitionStats.bodyCount }})
        </button>
        <button 
          v-if="store.recognitionStats.lowConfidenceCount > 0"
          class="chip-btn chip-warn" 
          :class="{ active: currentFilter === 'low-confidence' }"
          @click="currentFilter = 'low-confidence'"
        >
          待核对 ({{ store.recognitionStats.lowConfidenceCount }})
        </button>
        <button 
          v-if="Object.keys(store.userOverrides).length > 0" 
          class="chip-btn chip-reset" 
          @click="store.clearUserOverrides()" 
          title="重置所有手动指定的类型"
        >
          <RotateCcw class="w-2.5 h-2.5 inline mr-1" />重置
        </button>
      </div>
    </div>

    <!-- Table Header -->
    <div class="table-header-row">
      <span class="col-th col-idx">段落</span>
      <span class="col-th col-role">识别角色</span>
      <span class="col-th col-text">段落文本内容</span>
      <span class="col-th col-conf">置信度</span>
    </div>

    <!-- Table Body / List -->
    <div class="list-container">
      <div v-if="filteredResults.length === 0" class="empty-state">
        无匹配的段落
      </div>

      <div 
        v-for="item in filteredResults" 
        :key="item.paragraphIndex"
        class="compact-row-wrapper"
        :class="{ 'item-overridden': item.userOverridden }"
      >
        <div class="compact-row" @click="onRowClick(item.paragraphIndex)">
          <!-- Col 1: Index Badge with Jump Icon -->
          <div class="col-idx-box" title="点击在 WPS 中定位该段落">
            <span class="idx-text">P{{ item.paragraphIndex }}</span>
            <Eye class="w-3 h-3 eye-icon" />
          </div>

          <!-- Col 2: Role Dropdown Selector -->
          <div class="col-role-box" @click.stop>
            <select 
              :value="item.role" 
              class="compact-role-select"
              :class="`badge-role-${item.role}`"
              @change="onRoleChange(item.paragraphIndex, $event)"
              title="切换此段落的排版角色"
            >
              <option 
                v-for="opt in roleOptions" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- Col 3: Text Snippet -->
          <div class="col-text-box" :title="item.originalText || '（空白段落）'">
            <span v-if="item.originalText" class="text-content">{{ item.originalText }}</span>
            <span v-else class="text-empty">（空白段落）</span>
            <span v-if="item.inlineRanges && item.inlineRanges.length > 1" class="inline-tag">同段混排</span>
          </div>

          <!-- Col 4: Confidence & Reason Toggle -->
          <div 
            class="col-conf-box" 
            :class="{
              'conf-high': item.confidence >= 0.90,
              'conf-mid': item.confidence >= 0.70 && item.confidence < 0.90,
              'conf-low': item.confidence < 0.70
            }"
            @click.stop="toggleReason(item.paragraphIndex)"
            :title="`置信度: ${Math.round(item.confidence * 100)}%，点击查看/折叠判断依据`"
          >
            <span>{{ Math.round(item.confidence * 100) }}%</span>
            <ChevronDown v-if="expandedReasons[item.paragraphIndex]" class="w-3 h-3 text-slate-400" />
            <ChevronRight v-else class="w-3 h-3 text-slate-400" />
          </div>
        </div>

        <!-- Expanded Reason Panel -->
        <div v-if="expandedReasons[item.paragraphIndex]" class="reasons-panel">
          <div class="reason-rule">
            <span class="rule-label">规则编号:</span>
            <span class="rule-code">{{ item.ruleId }}</span>
            <span v-if="item.userOverridden" class="overridden-badge">已手动指定</span>
          </div>
          <ul class="reason-list">
            <li v-for="(r, rIdx) in item.reason" :key="rIdx">{{ r }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recognition-table-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 6px;
}

.toolbar-card {
  background: var(--wps-card-bg);
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.search-row {
  display: flex;
  gap: 6px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
}

.search-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 11.5px;
  color: var(--wps-text-main);
  background: transparent;
}

.btn-clear-search {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

.filter-dropdown {
  width: 130px;
  padding: 4px 6px;
  font-size: 11.5px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--wps-text-main);
  outline: none;
}

.filter-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.chip-btn {
  padding: 2px 7px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  font-size: 10.5px;
  color: var(--wps-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip-btn:hover {
  background: #e2e8f0;
  color: var(--wps-text-main);
}

.chip-btn.active {
  background: var(--wps-primary-light);
  border-color: var(--wps-primary);
  color: var(--wps-primary);
  font-weight: 600;
}

.chip-warn {
  background: #fef3c7;
  border-color: #fde68a;
  color: #b45309;
}

.chip-warn.active {
  background: #fbbf24;
  color: #78350f;
  border-color: #f59e0b;
}

.chip-reset {
  margin-left: auto;
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
  font-weight: 500;
}

.table-header-row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: #f1f5f9;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--wps-text-muted);
}

.col-th {
  display: flex;
  align-items: center;
}

.col-idx { width: 44px; }
.col-role { width: 90px; }
.col-text { flex: 1; padding: 0 6px; }
.col-conf { width: 55px; justify-content: flex-end; }

.list-container {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-right: 2px;
  padding-bottom: 20px;
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: var(--wps-text-muted);
  font-size: 12px;
  background: #ffffff;
  border: 1px dashed var(--wps-border);
  border-radius: var(--radius-md);
}

.compact-row-wrapper {
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  transition: all 0.12s ease;
}

.compact-row-wrapper:hover {
  border-color: #94a3b8;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.item-overridden {
  border-left: 3px solid var(--wps-primary);
  background: #f8fbff;
}

.compact-row {
  display: flex;
  align-items: center;
  padding: 5px 6px;
  gap: 6px;
  cursor: pointer;
  min-height: 34px;
}

.col-idx-box {
  width: 44px;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  flex-shrink: 0;
}

.idx-text {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid #e2e8f0;
}

.eye-icon {
  opacity: 0;
  color: var(--wps-primary);
  transition: opacity 0.15s ease;
}

.compact-row:hover .eye-icon {
  opacity: 1;
}

.col-role-box {
  width: 90px;
  flex-shrink: 0;
}

.compact-role-select {
  width: 100%;
  padding: 2px 4px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 3px;
  border: 1px solid transparent;
  cursor: pointer;
  outline: none;
}

/* Badge colors for role selector */
.badge-role-main-title { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
.badge-role-subtitle { background: #ffedd5; color: #9a3412; border-color: #fdba74; }
.badge-role-heading-1 { background: #e0e7ff; color: #3730a3; border-color: #a5b4fc; }
.badge-role-heading-2 { background: #e0f2fe; color: #075985; border-color: #7dd3fc; }
.badge-role-heading-3 { background: #f0fdf4; color: #166534; border-color: #86efac; }
.badge-role-heading-4 { background: #f3e8ff; color: #6b21a8; border-color: #d8b4fe; }
.badge-role-body { background: #f8fafc; color: #334155; border-color: #cbd5e1; }
.badge-role-attachment-marker,
.badge-role-attachment-title { background: #fdf4ff; color: #86198f; border-color: #f0abfc; }
.badge-role-table-caption,
.badge-role-figure-caption { background: #ecfeff; color: #155e75; border-color: #67e8f9; }
.badge-role-blank { background: #f1f5f9; color: #94a3b8; border-color: #e2e8f0; }

.col-text-box {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
}

.text-content {
  font-size: 11.5px;
  color: var(--wps-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-empty {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}

.inline-tag {
  font-size: 9px;
  background: #fef08a;
  color: #854d0e;
  padding: 1px 3px;
  border-radius: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.col-conf-box {
  width: 55px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  padding-right: 2px;
}

.conf-high { color: #16a34a; }
.conf-mid { color: #d97706; }
.conf-low { color: #dc2626; }

.reasons-panel {
  background: #f8fafc;
  border-top: 1px dashed var(--wps-border);
  padding: 6px 8px;
  font-size: 10.5px;
}

.reason-rule {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
}

.rule-label { color: #64748b; }
.rule-code { font-family: monospace; font-weight: 600; color: #0f172a; }
.overridden-badge {
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 2px;
}

.reason-list {
  margin: 0;
  padding-left: 14px;
  color: #475569;
}

.reason-list li {
  margin-bottom: 2px;
}
</style>
