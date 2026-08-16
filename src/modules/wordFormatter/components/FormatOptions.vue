<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { Sliders, ShieldCheck } from 'lucide-vue-next'
import { copyTextToClipboard } from '@/shared/utils/stringUtils'
import { extractDocumentDirectory, getDocumentPathInfo } from '../core/backup/BackupRepository'
import { BackupService } from '../core/backup/BackupService'

const store = useWordFormatterStore()
const copiedPath = ref(false)

const currentDocName = computed(() => {
  if (store.documentInfo?.name) return store.documentInfo.name
  if (store.documentInfo?.path) return getDocumentPathInfo(store.documentInfo.path).fileName
  return '未命名文档.docx'
})

const currentBackupDirectory = computed(() => {
  if (store.documentInfo?.path) {
    const dir = extractDocumentDirectory(store.documentInfo.path, store.documentInfo.name)
    if (dir) return dir
  }
  return '当前文档所在目录'
})

const currentExampleName = computed(() => {
  const fullName = store.documentInfo?.path || store.documentInfo?.name || '测试文档.docx'
  return BackupService.generateBackupFileName(fullName)
})

const handleCopyBackupPath = async () => {
  const path = currentBackupDirectory.value
  if (!path || path === '当前文档所在目录') return
  const ok = await copyTextToClipboard(path)
  if (ok) {
    copiedPath.value = true
    setTimeout(() => { copiedPath.value = false }, 1800)
  }
}
</script>

<template>
  <div v-if="store.selectedTemplate" class="options-card">
    <div class="options-header">
      <div class="label-box">
        <Sliders class="w-4 h-4 text-emerald-600" />
        <span class="title">排版与保护选项</span>
      </div>
    </div>

    <div class="options-body">
      <!-- Blank line mode -->
      <div class="option-row">
        <label class="option-label">空行处理策略</label>
        <select 
          v-model="store.selectedTemplate.options.blankLineMode" 
          class="option-select"
        >
          <option value="keep">保留所有空行（最安全）</option>
          <option value="keep-single-collapse-multiple">保留单空行，折叠连续多空行</option>
          <option value="remove-all">移除文档内全部空行</option>
        </select>
      </div>

      <!-- Checkboxes -->
      <div class="checkbox-group">
        <label class="checkbox-item">
          <input 
            v-model="store.selectedTemplate.options.protectEmphasisFormatting" 
            type="checkbox" 
          />
          <span class="checkbox-label">
            <strong>保护强调格式</strong>（保留原有红色、加粗、下划线）
          </span>
        </label>

        <label class="checkbox-item">
          <input 
            v-model="store.selectedTemplate.options.preserveImagesAndShapes" 
            type="checkbox" 
          />
          <span class="checkbox-label">
            <strong>保护嵌入对象</strong>（防止图片、图表、书签破坏）
          </span>
        </label>

        <label class="checkbox-item">
          <input 
            v-model="store.selectedTemplate.options.autoDetectInlineHeading2" 
            type="checkbox" 
          />
          <span class="checkbox-label">
            <strong>支持同段二级标题</strong>（“（一）标题。正文…”独立设置）
          </span>
        </label>

        <label class="checkbox-item">
          <input 
            v-model="store.selectedTemplate.options.convertWesternNumbersFont" 
            type="checkbox" 
          />
          <span class="checkbox-label">
            <strong>西文与数字字体</strong>（统一为 Times New Roman）
          </span>
        </label>

        <label class="checkbox-item">
          <input 
            v-model="store.selectedTemplate.options.applyOutlineLevels" 
            type="checkbox" 
          />
          <span class="checkbox-label">
            <strong>生成大纲导航</strong>（自动同步 WPS 左侧导航目录级别）
          </span>
        </label>

        <label class="checkbox-item">
          <input 
            v-model="store.selectedTemplate.options.normalizePunctuation" 
            type="checkbox" 
          />
          <span class="checkbox-label">
            <strong>中英文标点规范化</strong>（智能排除网址、小数与日期）
          </span>
        </label>
      </div>

      <!-- V2.4 Automatic Physical Backup Settings -->
      <div class="backup-section">
        <div class="backup-header">
          <label class="checkbox-item">
            <input 
              :checked="store.backupConfig.enabled"
              @change="store.updateBackupConfig({ enabled: ($event.target as HTMLInputElement).checked })"
              type="checkbox" 
            />
            <span class="checkbox-label">
              <strong>排版前自动物理备份</strong>
            </span>
          </label>
        </div>
        <div v-if="store.backupConfig.enabled" class="backup-details">
          <div class="backup-info-row">
            <span class="backup-info-label">备份位置：</span>
            <span class="backup-info-val highlight">当前文档所在目录</span>
          </div>
          <div class="backup-info-row">
            <span class="backup-info-label">当前文档：</span>
            <span class="backup-info-val" :title="currentDocName">{{ currentDocName }}</span>
          </div>
          <div class="backup-path-row">
            <span class="backup-path-text" :title="'备份所在目录：' + currentBackupDirectory">
              📁 {{ currentBackupDirectory }}
            </span>
            <button class="btn-copy-path" @click="handleCopyBackupPath" title="点击复制备份文件夹路径">
              {{ copiedPath ? '✅ 已复制' : '复制路径' }}
            </button>
          </div>
          <div class="backup-info-row example-row">
            <span class="backup-info-label">备份示例：</span>
            <span class="backup-info-val monospace" :title="currentExampleName">{{ currentExampleName }}</span>
          </div>
          <div class="backup-param-row">
            <span class="backup-param-label">保留最近：</span>
            <select 
              class="backup-select"
              :value="store.backupConfig.retentionCount"
              @change="store.updateBackupConfig({ retentionCount: parseInt(($event.target as HTMLSelectElement).value, 10) || 10 })"
            >
              <option :value="5">5 份</option>
              <option :value="10">10 份 (默认)</option>
              <option :value="20">20 份</option>
              <option :value="999">全部保留</option>
            </select>
            <span class="backup-count-badge">已备份 {{ store.backupSummary?.totalBackups || 0 }} 份</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.options-card {
  background: var(--wps-card-bg);
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.options-header {
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

.options-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-label {
  font-size: 11px;
  color: var(--wps-text-muted);
}

.option-select {
  padding: 5px 8px;
  font-size: 11.5px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--wps-text-main);
  outline: none;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  margin-top: 2px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 11px;
  color: var(--wps-text-main);
  line-height: 1.3;
}

.checkbox-label strong {
  font-weight: 600;
}

/* V2.4 Backup Section Styling */
.backup-section {
  margin-top: 6px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.backup-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 18px;
}

.backup-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #475569;
}

.backup-info-label {
  font-weight: 500;
  color: #64748b;
  min-width: 60px;
}

.backup-info-val {
  font-size: 11px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.backup-info-val.highlight {
  color: #059669;
  font-weight: 600;
}

.backup-info-val.monospace {
  font-family: monospace;
  font-size: 10px;
  color: #475569;
}

.backup-param-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #475569;
  margin-top: 2px;
}

.backup-param-label {
  font-weight: 500;
  color: #64748b;
  min-width: 60px;
}

.backup-select {
  padding: 2px 6px;
  font-size: 11px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #334155;
  outline: none;
}

.backup-count-badge {
  font-size: 10.5px;
  color: #0284c7;
  background: #e0f2fe;
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: auto;
}

.backup-path-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 3px 6px;
}

.backup-path-text {
  font-size: 10.5px;
  font-family: monospace;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 170px;
}

.btn-copy-path {
  padding: 2px 6px;
  font-size: 10px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  color: #334155;
  cursor: pointer;
  white-space: nowrap;
}

.btn-copy-path:hover {
  background: #e2e8f0;
}
</style>
