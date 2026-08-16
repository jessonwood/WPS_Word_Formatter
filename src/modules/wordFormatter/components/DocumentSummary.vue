<script setup lang="ts">
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { FileText, RefreshCw, Layers, Table as TableIcon } from 'lucide-vue-next'

const store = useWordFormatterStore()

const handleRescan = () => {
  store.scanDocument()
}
</script>

<template>
  <div class="doc-summary-card">
    <div class="doc-header">
      <div class="doc-icon-badge">
        <FileText class="w-4 h-4 text-blue-600" />
      </div>
      <div class="doc-info">
        <div class="doc-name" :title="store.documentInfo?.name || '无活动文档'">
          {{ store.documentInfo?.name || '未检测到 WPS Writer 文档' }}
        </div>
        <div class="doc-meta">
          <span>{{ store.documentModel?.paragraphCount || 0 }} 段落</span>
          <span class="dot">•</span>
          <span>{{ store.documentModel?.tableCount || 0 }} 表格</span>
          <span class="dot">•</span>
          <span>{{ store.documentModel?.metadata.charCount || 0 }} 字</span>
        </div>
      </div>
      <button 
        class="btn-rescan" 
        :disabled="store.scanStatus === 'scanning'" 
        @click="handleRescan"
        title="重新扫描分析当前文档"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': store.scanStatus === 'scanning' }" />
        <span>{{ store.scanStatus === 'scanning' ? '扫描中' : '重新扫描' }}</span>
      </button>
    </div>

    <!-- Error warning if any -->
    <div v-if="store.errorMessage && store.scanStatus === 'error'" class="error-banner">
      <div class="error-title">扫描错误 ({{ store.errorMessage }})</div>
      <div v-if="store.errorDetails" class="error-details">{{ store.errorDetails }}</div>
    </div>
  </div>
</template>

<style scoped>
.doc-summary-card {
  background: var(--wps-card-bg);
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.doc-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.doc-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--wps-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wps-primary);
  flex-shrink: 0;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--wps-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-meta {
  font-size: 11px;
  color: var(--wps-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.dot {
  color: var(--wps-text-light);
}

.btn-rescan {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: #fff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--wps-text-main);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-rescan:hover:not(:disabled) {
  border-color: var(--wps-primary);
  color: var(--wps-primary);
  background: var(--wps-primary-light);
}

.btn-rescan:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-banner {
  margin-top: 8px;
  padding: 8px;
  background: var(--wps-danger-light);
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  color: var(--wps-danger);
  font-size: 11px;
}

.error-title {
  font-weight: 600;
}

.error-details {
  margin-top: 2px;
  color: #991b1b;
  word-break: break-all;
}
</style>
