<template>
  <div v-if="visible" class="backup-prompt-backdrop" @click.self="handleCancel">
    <div class="backup-prompt-card">
      <!-- Header -->
      <div class="backup-prompt-header" :class="promptType">
        <div class="icon-badge">
          <span v-if="promptType === 'needs-save'">⚠️</span>
          <span v-else>📄</span>
        </div>
        <div class="header-text">
          <h3 class="prompt-title">
            {{ promptType === 'needs-save' ? '当前文档存在未保存修改' : '当前文档尚未保存到磁盘' }}
          </h3>
          <p class="prompt-subtitle">
            {{ promptType === 'needs-save' ? '排版前自动物理备份提示' : '新建文档物理备份提示' }}
          </p>
        </div>
        <button class="btn-close" @click="handleCancel">×</button>
      </div>

      <!-- Body -->
      <div class="backup-prompt-body">
        <div class="notice-box" :class="promptType">
          <p v-if="promptType === 'needs-save'" class="notice-desc">
            检测到当前文档 <strong>{{ docName }}</strong> 在 WPS 中存在尚未保存的正文修改。<br />
            如果直接从磁盘复制，备份副本只能包含<strong>上一次保存时的旧内容</strong>，将丢失当前尚未落盘的修改。
          </p>
          <p v-else class="notice-desc">
            当前文档为新建文档（尚未保存到磁盘文件），暂无物理文件路径，无法在同目录下创建 <code>.docx</code> 备份文件。
          </p>
        </div>

        <div class="doc-info-list">
          <div class="info-row">
            <span class="lbl">文档名称：</span>
            <span class="val font-mono">{{ docName }}</span>
          </div>
          <div class="info-row" v-if="docPath">
            <span class="lbl">文件路径：</span>
            <span class="val font-mono text-xs">{{ docPath }}</span>
          </div>
          <div class="info-row">
            <span class="lbl">安全保障：</span>
            <span class="val text-emerald-700 font-bold">无论是否创建物理文件，插件均会创建内存快照 (Snapshot) 并支持 WPS 原生一键撤销。</span>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="backup-prompt-footer">
        <button class="btn-cancel" @click="handleCancel">
          取消操作
        </button>

        <button class="btn-skip" @click="handleSkipBackup">
          {{ promptType === 'needs-save' ? '不保存，继续排版 (不创建物理备份)' : '不备份，直接排版' }}
        </button>

        <button v-if="promptType === 'needs-save'" class="btn-save-continue" @click="handleSaveAndContinue">
          💾 保存并继续排版 (推荐)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  promptType: 'needs-save' | 'unavailable'
  docName: string
  docPath?: string
}>()

const emit = defineEmits<{
  (e: 'save-and-continue'): void
  (e: 'skip-backup'): void
  (e: 'cancel'): void
}>()

function handleSaveAndContinue() {
  emit('save-and-continue')
}

function handleSkipBackup() {
  emit('skip-backup')
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.backup-prompt-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.backup-prompt-card {
  background: #ffffff;
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.backup-prompt-header {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.backup-prompt-header.needs-save {
  background: #fffbeb;
  border-color: #fde68a;
}

.backup-prompt-header.unavailable {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.icon-badge {
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text {
  flex: 1;
}

.prompt-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.prompt-subtitle {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: #64748b;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.btn-close:hover {
  color: #334155;
}

.backup-prompt-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notice-box {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.notice-box.needs-save {
  background: #fefce8;
  border: 1px solid #fef08a;
  color: #854d0e;
}

.notice-box.unavailable {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.notice-desc strong {
  color: #0f172a;
}

.doc-info-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11.5px;
}

.info-row .lbl {
  color: #64748b;
  min-width: 65px;
  font-weight: 500;
}

.info-row .val {
  color: #1e293b;
  word-break: break-all;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.backup-prompt-footer {
  padding: 12px 18px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  padding: 6px 12px;
  font-size: 11.5px;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #f1f5f9;
  color: #334155;
}

.btn-skip {
  padding: 6px 12px;
  font-size: 11.5px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  color: #334155;
  cursor: pointer;
}

.btn-skip:hover {
  background: #f1f5f9;
  border-color: #64748b;
}

.btn-save-continue {
  padding: 6px 14px;
  font-size: 11.5px;
  font-weight: 600;
  background: #10b981;
  border: 1px solid #059669;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn-save-continue:hover {
  background: #059669;
}
</style>
