<script setup lang="ts">
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { Loader2 } from 'lucide-vue-next'

const store = useWordFormatterStore()
</script>

<template>
  <div v-if="store.formatStatus === 'formatting' && store.progress" class="progress-container">
    <div class="progress-header">
      <div class="status-box">
        <Loader2 class="w-4 h-4 text-blue-600 animate-spin" />
        <span class="status-msg">{{ store.progress.message }}</span>
      </div>
      <span class="pct-text">{{ store.progress.percentage }}%</span>
    </div>

    <div class="progress-bar-bg">
      <div 
        class="progress-bar-fill" 
        :style="{ width: `${store.progress.percentage}%` }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.progress-container {
  background: var(--wps-card-bg);
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.status-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-msg {
  font-size: 12px;
  font-weight: 500;
  color: var(--wps-text-main);
}

.pct-text {
  font-size: 12px;
  font-weight: 700;
  color: var(--wps-primary);
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
