<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { HeaderFooterService } from '../core/headersFooters/HeaderFooterService'
import { wpsWriterAdapter } from '../adapters/WpsWriterAdapter'
import type { HeaderFooterConfig } from '../types/headersFooters'
import { Heading1, AlignLeft, AlignCenter, AlignRight, Check, Play } from 'lucide-vue-next'

const store = useWordFormatterStore()
const hfService = new HeaderFooterService(wpsWriterAdapter)
const isApplying = ref(false)
const applySuccessToast = ref<string | null>(null)

const config = ref<HeaderFooterConfig>({
  enabled: store.selectedTemplate.headerFooter?.enabled ?? true,
  headerEnabled: store.selectedTemplate.headerFooter?.headerEnabled ?? true,
  footerEnabled: store.selectedTemplate.headerFooter?.footerEnabled ?? true,
  headerText: store.selectedTemplate.headerFooter?.headerText ?? '',
  footerText: store.selectedTemplate.headerFooter?.footerText ?? '',
  headerAlignment: store.selectedTemplate.headerFooter?.headerAlignment ?? 'center',
  footerAlignment: store.selectedTemplate.headerFooter?.footerAlignment ?? 'center',
  differentFirstPage: store.selectedTemplate.headerFooter?.differentFirstPage ?? true,
  differentOddEven: store.selectedTemplate.headerFooter?.differentOddEven ?? false,
  linkToPrevious: store.selectedTemplate.headerFooter?.linkToPrevious ?? true,
  headerDistancePt: store.selectedTemplate.headerFooter?.headerDistancePt ?? 42.5,
  footerDistancePt: store.selectedTemplate.headerFooter?.footerDistancePt ?? 49.6
})

const handleApplyHeaderFooter = async () => {
  if (!store.documentModel) return
  isApplying.value = true
  try {
    await hfService.applyHeaderFooter(store.documentModel, config.value, store.selectedTemplate.pageNumber)
    applySuccessToast.value = '页眉页脚应用成功！'
    setTimeout(() => {
      applySuccessToast.value = null
    }, 2000)
  } catch (e: any) {
    alert('应用页眉页脚失败: ' + e.message)
  } finally {
    isApplying.value = false
  }
}
</script>

<template>
  <div class="hf-settings-card">
    <div class="hf-card-header">
      <div class="header-title-box">
        <Heading1 class="w-4 h-4 text-blue-600" />
        <span class="hf-title">页眉页脚设置</span>
      </div>
      <label class="switch-toggle">
        <input type="checkbox" v-model="config.enabled" />
        <span class="slider"></span>
      </label>
    </div>

    <div v-if="config.enabled" class="hf-card-body">
      <!-- 1. Header Section -->
      <div class="hf-sub-section">
        <div class="sub-section-header">
          <label class="checkbox-label">
            <input type="checkbox" v-model="config.headerEnabled" />
            <span>启用页眉</span>
          </label>
          <div v-if="config.headerEnabled" class="align-group">
            <button 
              class="btn-align" 
              :class="{ active: config.headerAlignment === 'left' }" 
              @click="config.headerAlignment = 'left'"
            >
              <AlignLeft class="w-3 h-3" />
            </button>
            <button 
              class="btn-align" 
              :class="{ active: config.headerAlignment === 'center' }" 
              @click="config.headerAlignment = 'center'"
            >
              <AlignCenter class="w-3 h-3" />
            </button>
            <button 
              class="btn-align" 
              :class="{ active: config.headerAlignment === 'right' }" 
              @click="config.headerAlignment = 'right'"
            >
              <AlignRight class="w-3 h-3" />
            </button>
          </div>
        </div>
        <input 
          v-if="config.headerEnabled"
          v-model="config.headerText" 
          class="hf-input" 
          placeholder="请输入页眉文字（如公文标题/密级等）..." 
        />
      </div>

      <!-- 2. Footer Section -->
      <div class="hf-sub-section">
        <div class="sub-section-header">
          <label class="checkbox-label">
            <input type="checkbox" v-model="config.footerEnabled" />
            <span>启用页脚文字</span>
          </label>
          <div v-if="config.footerEnabled" class="align-group">
            <button 
              class="btn-align" 
              :class="{ active: config.footerAlignment === 'left' }" 
              @click="config.footerAlignment = 'left'"
            >
              <AlignLeft class="w-3 h-3" />
            </button>
            <button 
              class="btn-align" 
              :class="{ active: config.footerAlignment === 'center' }" 
              @click="config.footerAlignment = 'center'"
            >
              <AlignCenter class="w-3 h-3" />
            </button>
            <button 
              class="btn-align" 
              :class="{ active: config.footerAlignment === 'right' }" 
              @click="config.footerAlignment = 'right'"
            >
              <AlignRight class="w-3 h-3" />
            </button>
          </div>
        </div>
        <input 
          v-if="config.footerEnabled"
          v-model="config.footerText" 
          class="hf-input" 
          placeholder="请输入页脚文字（可选，与页码独立）..." 
        />
      </div>

      <!-- 3. Multi-section and Rules -->
      <div class="hf-options-grid">
        <label class="checkbox-label">
          <input type="checkbox" v-model="config.differentFirstPage" />
          <span>首页不同 (封面无页眉页脚)</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="config.linkToPrevious" />
          <span>链接到前一节 (保持连续)</span>
        </label>
      </div>

      <div class="action-row">
        <span v-if="applySuccessToast" class="toast-text">{{ applySuccessToast }}</span>
        <button 
          class="btn-apply-hf" 
          :disabled="isApplying || !store.documentModel" 
          @click="handleApplyHeaderFooter"
        >
          <Play class="w-3.5 h-3.5 fill-white mr-1" />
          <span>{{ isApplying ? '正在应用...' : '应用页眉页脚' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hf-settings-card {
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hf-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hf-title {
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
  background-color: var(--wps-primary);
}

input:checked + .slider:before {
  transform: translateX(14px);
}

.hf-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hf-sub-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--wps-text-main);
  cursor: pointer;
}

.align-group {
  display: flex;
  gap: 2px;
}

.btn-align {
  padding: 2px 4px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  border-radius: 2px;
  cursor: pointer;
}

.btn-align.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.hf-input {
  width: 100%;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
}

.hf-options-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 2px;
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

.btn-apply-hf {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #185adb;
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.btn-apply-hf:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
