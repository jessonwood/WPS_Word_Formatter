<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { TocService } from '../core/toc/TocService'
import { wpsWriterAdapter } from '../adapters/WpsWriterAdapter'
import type { TocConfig, TocInfo, TocInsertMode } from '../types/toc'
import { BookOpen, RefreshCw, Trash2, Plus, AlertCircle, Check } from 'lucide-vue-next'

const store = useWordFormatterStore()
const tocService = new TocService(wpsWriterAdapter)

const isOperating = ref(false)
const detectedToc = ref<TocInfo>({ exists: false, count: 0 })
const actionSuccessToast = ref<string | null>(null)

const config = ref<TocConfig>({
  enabled: true,
  startLevel: 1,
  endLevel: 3,
  showPageNumbers: true,
  rightAlignPageNumbers: true,
  useHyperlinks: true,
  tabLeader: 'dots',
  insertMode: 'after-title',
  separatePage: true
})

const refreshTocDetection = async () => {
  if (!store.documentModel) return
  detectedToc.value = await tocService.detect()
}

onMounted(() => {
  refreshTocDetection()
})

const handleInsertToc = async () => {
  isOperating.value = true
  try {
    await tocService.insert(config.value)
    await refreshTocDetection()
    actionSuccessToast.value = '目录已成功插入！'
    setTimeout(() => { actionSuccessToast.value = null }, 2000)
  } catch (e: any) {
    alert('插入目录失败: ' + e.message)
  } finally {
    isOperating.value = false
  }
}

const handleUpdateToc = async () => {
  isOperating.value = true
  try {
    await tocService.update(1)
    await refreshTocDetection()
    actionSuccessToast.value = '目录已刷新更新！'
    setTimeout(() => { actionSuccessToast.value = null }, 2000)
  } catch (e: any) {
    alert('更新目录失败: ' + e.message)
  } finally {
    isOperating.value = false
  }
}

const handleDeleteToc = async () => {
  if (!confirm('确定从文档中删除当前目录吗？')) return
  isOperating.value = true
  try {
    await tocService.delete(1)
    await refreshTocDetection()
    actionSuccessToast.value = '目录已删除！'
    setTimeout(() => { actionSuccessToast.value = null }, 2000)
  } catch (e: any) {
    alert('删除目录失败: ' + e.message)
  } finally {
    isOperating.value = false
  }
}
</script>

<template>
  <div class="toc-settings-card">
    <div class="toc-card-header">
      <div class="header-title-box">
        <BookOpen class="w-4 h-4 text-emerald-600" />
        <span class="toc-title">自动目录 (TOC)</span>
      </div>
      <span v-if="detectedToc.exists" class="toc-badge badge-exists">
        已检测到目录 ({{ detectedToc.count }}处)
      </span>
      <span v-else class="toc-badge badge-none">
        未插入目录
      </span>
    </div>

    <div class="toc-card-body">
      <!-- Stale heading notice (Hint only, never forces) -->
      <div v-if="detectedToc.exists" class="stale-notice-box">
        <AlertCircle class="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <div class="stale-text">
          已检测到目录。若文档刚完成识别或排版，点击下方<strong>【更新已有目录】</strong>即可自动标定大纲并刷新目录内容。
        </div>
      </div>

      <!-- Level settings & Insert Mode -->
      <div class="toc-row">
        <div class="toc-col">
          <label class="sub-label">包含大纲级别</label>
          <div class="level-range-box">
            <span>{{ config.startLevel }} 级</span>
            <span class="level-sep">至</span>
            <select v-model.number="config.endLevel" class="level-select">
              <option :value="1">1 级标题</option>
              <option :value="2">2 级标题</option>
              <option :value="3">3 级标题 (推荐)</option>
              <option :value="4">4 级标题</option>
              <option :value="5">5 级标题</option>
              <option :value="6">6 级标题</option>
              <option :value="9">9 级全量</option>
            </select>
          </div>
        </div>

        <div class="toc-col">
          <label class="sub-label">插入位置</label>
          <select v-model="config.insertMode" class="toc-select">
            <option value="after-title">主标题之后 (推荐)</option>
            <option value="current-selection">当前光标位置</option>
            <option value="beginning">文档最开头</option>
          </select>
        </div>
      </div>

      <!-- Standalone Page Checkbox -->
      <div class="toc-options-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="config.separatePage" />
          <span>目录单独成页（自动插入分页符与“目  录”标头）</span>
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="toc-action-bar">
        <span v-if="actionSuccessToast" class="toast-text">{{ actionSuccessToast }}</span>

        <template v-if="detectedToc.exists">
          <button 
            class="btn-toc-del" 
            :disabled="isOperating || !store.documentModel" 
            @click="handleDeleteToc"
            title="删除文档中的已有目录"
          >
            <Trash2 class="w-3.5 h-3.5 mr-1" />
            <span>删除目录</span>
          </button>

          <button 
            class="btn-toc-update" 
            :disabled="isOperating || !store.documentModel" 
            @click="handleUpdateToc"
            title="重新更新已有目录页码与条目"
          >
            <RefreshCw class="w-3.5 h-3.5 mr-1" :class="{ 'animate-spin': isOperating }" />
            <span>更新已有目录</span>
          </button>
        </template>

        <template v-else>
          <button 
            class="btn-toc-insert" 
            :disabled="isOperating || !store.documentModel" 
            @click="handleInsertToc"
          >
            <Plus class="w-3.5 h-3.5 mr-1" />
            <span>插入自动目录</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toc-settings-card {
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toc-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toc-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--wps-text-main);
}

.toc-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.badge-exists {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.badge-none {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.toc-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stale-notice-box {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.stale-text {
  font-size: 10.5px;
  color: #92400e;
  line-height: 1.4;
}

.toc-row {
  display: flex;
  gap: 8px;
}

.toc-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sub-label {
  font-size: 10.5px;
  color: #64748b;
  font-weight: 500;
}

.level-range-box {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.level-sep {
  color: #94a3b8;
}

.level-select, .toc-select {
  width: 100%;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
}

.toc-action-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.toast-text {
  font-size: 11px;
  color: #16a34a;
  margin-right: auto;
}

.btn-toc-insert {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  background: #16a34a;
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-toc-update {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  background: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-toc-del {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  background: #ffffff;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
}

.btn-toc-insert:disabled, .btn-toc-update:disabled, .btn-toc-del:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
