<script setup lang="ts">
import { ref } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { PageNumberService } from '../core/headersFooters/PageNumberService'
import { wpsWriterAdapter } from '../adapters/WpsWriterAdapter'
import type { PageNumberConfig, PageNumberPosition, PageNumberStyle } from '../types/headersFooters'
import { Hash, Play } from 'lucide-vue-next'

const store = useWordFormatterStore()
const pnService = new PageNumberService(wpsWriterAdapter)
const isApplying = ref(false)
const applySuccessToast = ref<string | null>(null)

const config = ref<PageNumberConfig>({
  enabled: store.selectedTemplate.pageNumber?.enabled ?? true,
  position: store.selectedTemplate.pageNumber?.position ?? 'footer-center',
  style: store.selectedTemplate.pageNumber?.style ?? 'chinese-dash',
  startAt: store.selectedTemplate.pageNumber?.startAt ?? 1,
  restartPerSection: store.selectedTemplate.pageNumber?.restartPerSection ?? false,
  showOnFirstPage: store.selectedTemplate.pageNumber?.showOnFirstPage ?? false,
  numberFormat: 'arabic'
})

const handleApplyPageNumbers = async () => {
  if (!store.documentModel) return
  isApplying.value = true
  try {
    await pnService.applyPageNumbers(store.documentModel, config.value, store.selectedTemplate.headerFooter)
    applySuccessToast.value = '页码生成成功！'
    setTimeout(() => {
      applySuccessToast.value = null
    }, 2000)
  } catch (e: any) {
    alert('生成页码失败: ' + e.message)
  } finally {
    isApplying.value = false
  }
}
</script>

<template>
  <div class="pn-settings-card">
    <div class="pn-card-header">
      <div class="header-title-box">
        <Hash class="w-4 h-4 text-indigo-600" />
        <span class="pn-title">页码样式与编号</span>
      </div>
      <label class="switch-toggle">
        <input type="checkbox" v-model="config.enabled" />
        <span class="slider"></span>
      </label>
    </div>

    <div v-if="config.enabled" class="pn-card-body">
      <!-- 1. Position & Style -->
      <div class="pn-row">
        <div class="pn-col">
          <label class="sub-label">页码位置</label>
          <select v-model="config.position" class="pn-select">
            <option value="footer-center">页脚居中</option>
            <option value="footer-left">页脚左侧</option>
            <option value="footer-right">页脚右侧</option>
            <option value="header-right">页眉右侧</option>
            <option value="header-center">页眉居中</option>
          </select>
        </div>

        <div class="pn-col">
          <label class="sub-label">页码样式</label>
          <select v-model="config.style" class="pn-select">
            <option value="chinese-dash">— 1 — (公文标准)</option>
            <option value="dash">- 1 - (短划线)</option>
            <option value="plain">1 (纯数字)</option>
          </select>
        </div>
      </div>

      <!-- 2. Starting Number and Per-Section -->
      <div class="pn-row">
        <div class="pn-col">
          <label class="sub-label">起始页码</label>
          <input 
            type="number" 
            v-model.number="config.startAt" 
            min="1" 
            max="9999" 
            class="pn-input" 
          />
        </div>

        <div class="pn-col checkbox-col">
          <label class="checkbox-label">
            <input type="checkbox" v-model="config.showOnFirstPage" />
            <span>首页显示页码</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="config.restartPerSection" />
            <span>分节重新编号</span>
          </label>
        </div>
      </div>

      <div class="action-row">
        <span v-if="applySuccessToast" class="toast-text">{{ applySuccessToast }}</span>
        <button 
          class="btn-apply-pn" 
          :disabled="isApplying || !store.documentModel" 
          @click="handleApplyPageNumbers"
        >
          <Play class="w-3.5 h-3.5 fill-white mr-1" />
          <span>{{ isApplying ? '正在生成...' : '生成/更新页码' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pn-settings-card {
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pn-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pn-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--wps-text-main);
}

.switch-toggle {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
}

.switch-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.2s;
  border-radius: 18px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4f46e5;
}

input:checked + .slider:before {
  transform: translateX(14px);
}

.pn-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pn-row {
  display: flex;
  gap: 8px;
}

.pn-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.checkbox-col {
  justify-content: center;
  gap: 4px;
}

.sub-label {
  font-size: 10.5px;
  color: #64748b;
  font-weight: 500;
}

.pn-select, .pn-input {
  width: 100%;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--wps-text-main);
  cursor: pointer;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.toast-text {
  font-size: 11px;
  color: #16a34a;
}

.btn-apply-pn {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.btn-apply-pn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
