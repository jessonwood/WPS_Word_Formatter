<template>
  <div v-if="visible" class="diag-modal-backdrop" @click.self="$emit('close')">
    <div class="diag-modal-card">
      <!-- Modal Header -->
      <div class="diag-modal-header">
        <div class="diag-title-wrap">
          <div class="diag-icon-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <h2 class="diag-title">WPS 环境与接口能力深度诊断</h2>
            <p class="diag-subtitle">实机测试 WPS JSAPI、文件系统兼容矩阵与活动文档对象</p>
          </div>
        </div>
        <button class="diag-btn-close" @click="$emit('close')" title="关闭">×</button>
      </div>

      <!-- Overview Status Banner -->
      <div class="diag-summary-banner" :class="report.overall">
        <div class="diag-banner-content">
          <div class="diag-overall-tag" :class="report.overall">
            {{ report.overall === 'healthy' ? '✅ 环境状态良好' : report.overall === 'warning' ? '⚠ 存在兼容差异' : '❌ 核心能力异常' }}
          </div>
          <div class="diag-banner-text">
            {{ report.summary }}
          </div>
        </div>
        <div class="diag-banner-actions">
          <button class="btn-refresh-diag" @click="refreshDiagnostics">
            🔄 重新诊断
          </button>
          <button class="btn-copy-diag" @click="copyReportText">
            {{ copied ? '✅ 已复制报告' : '📋 复制诊断报告' }}
          </button>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="diag-modal-body">
        <!-- Navigation Tabs -->
        <div class="diag-tabs">
          <button 
            class="diag-tab-btn" 
            :class="{ active: activeTab === 'fs' }"
            @click="activeTab = 'fs'"
          >
            📁 FileSystem 能力矩阵 ({{ report.fileSystemMatrix.length }})
          </button>
          <button 
            class="diag-tab-btn" 
            :class="{ active: activeTab === 'api' }"
            @click="activeTab = 'api'"
          >
            ⚙️ WPS 全局 API ({{ report.apiCapabilities.length }})
          </button>
          <button 
            class="diag-tab-btn" 
            :class="{ active: activeTab === 'doc' }"
            @click="activeTab = 'doc'"
          >
            📄 活动文档探查 ({{ report.documentApiDiagnostics.length }})
          </button>
          <button 
            class="diag-tab-btn" 
            :class="{ active: activeTab === 'paths' }"
            @click="activeTab = 'paths'"
          >
            🗂️ 存储与备份路径 ({{ report.storagePaths.length }})
          </button>
        </div>

        <!-- Tab 1: FileSystem Matrix -->
        <div v-if="activeTab === 'fs'" class="diag-tab-pane">
          <div class="pane-hint">
            💡 本项通过在 <code>%APPDATA%\WPSWordFormatter\diagnostics\</code> 写入测试文件并即时校验删除，实机探查当前 WPS 底层文件系统 API 可用性。
          </div>
          <div class="table-container">
            <table class="diag-table">
              <thead>
                <tr>
                  <th style="width: 190px;">API 方法</th>
                  <th style="width: 120px;">链路角色</th>
                  <th style="width: 130px;">探测状态</th>
                  <th>实机测试说明 / 真实结果</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in report.fileSystemMatrix" :key="item.api">
                  <td class="font-mono font-bold">{{ item.api }}</td>
                  <td>
                    <span class="role-badge" :class="(item.role || 'PRIMARY').toLowerCase().replace('-', '_')">
                      {{ item.role || 'PRIMARY' }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" :class="item.status.toLowerCase()">
                      {{ item.status === 'PASS' ? '✅ PASS' : item.status === 'INCOMPATIBLE' ? '⚪ INCOMPATIBLE' : item.status === 'NOT_USED' ? '⚪ NOT USED' : item.status === 'FAIL' ? '❌ FAIL' : '⚪ ' + item.status }}
                    </span>
                  </td>
                  <td class="msg-cell" :class="{ 'has-error': item.status === 'FAIL' }">
                    {{ item.message || item.errorDetail || '正常' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 2: Global WPS API -->
        <div v-if="activeTab === 'api'" class="diag-tab-pane">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">WPS 版本:</span>
              <span class="info-val">{{ report.wpsVersion }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">加载项版本:</span>
              <span class="info-val">{{ report.addinVersion }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">宿主类型:</span>
              <span class="info-val">{{ report.hostType.toUpperCase() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">运行平台:</span>
              <span class="info-val">{{ report.environment.os }}</span>
            </div>
          </div>

          <div class="table-container" style="margin-top: 12px;">
            <table class="diag-table">
              <thead>
                <tr>
                  <th style="width: 220px;">接口 / 对象</th>
                  <th style="width: 120px;">可用状态</th>
                  <th>能力描述 / 属性细节</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="api in report.apiCapabilities" :key="api.name">
                  <td class="font-mono font-bold">{{ api.name }}</td>
                  <td>
                    <span class="status-badge" :class="api.status">
                      {{ api.status === 'available' ? '✅ 可用' : api.status === 'partial' ? '⚠ 部分' : '❌ 缺失' }}
                    </span>
                  </td>
                  <td class="msg-cell">{{ api.detail || '未提供详细信息' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 3: Document API -->
        <div v-if="activeTab === 'doc'" class="diag-tab-pane">
          <div class="pane-hint">
            🔒 诊断引擎仅对当前活动文档进行非破坏性只读探查，绝不修改正文内容。
          </div>
          <div class="table-container">
            <table class="diag-table">
              <thead>
                <tr>
                  <th style="width: 240px;">文档属性 / 状态</th>
                  <th style="width: 120px;">探查状态</th>
                  <th>当前值 / 检测结果</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="docItem in report.documentApiDiagnostics" :key="docItem.api">
                  <td class="font-mono font-bold">{{ docItem.api }}</td>
                  <td>
                    <span class="status-badge" :class="docItem.status.toLowerCase()">
                      {{ docItem.status === 'SAVED' ? '✅ SAVED' : docItem.status === 'UNSAVED' ? '⚠ UNSAVED' : docItem.status === 'PASS' ? '✅ 正常' : docItem.status === 'WARN' ? '⚠ 提示' : docItem.status === 'FAIL' ? '❌ 异常' : '⚪ 未测试' }}
                    </span>
                  </td>
                  <td class="msg-cell font-mono">{{ docItem.value !== undefined ? docItem.value : docItem.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 4: Storage Paths & Backup Diagnostics -->
        <div v-if="activeTab === 'paths'" class="diag-tab-pane">
          <!-- Backup Capability Card -->
          <div v-if="report.backupDiagnostics" class="backup-diag-card">
            <h4 class="backup-diag-title">🛡️ 自动物理备份策略与就绪诊断</h4>
            <div class="backup-diag-grid">
              <div class="backup-diag-item">
                <span class="lbl">备份策略：</span>
                <span class="val font-bold text-emerald-700">{{ report.backupDiagnostics.strategy }}</span>
              </div>
              <div class="backup-diag-item">
                <span class="lbl">当前活动文档：</span>
                <span class="val font-mono">{{ report.backupDiagnostics.activeDocumentPath }}</span>
              </div>
              <div class="backup-diag-item">
                <span class="lbl">当前备份目录：</span>
                <span class="val font-mono">{{ report.backupDiagnostics.backupDirectory }}</span>
              </div>
              <div class="backup-diag-item">
                <span class="lbl">Binary API：</span>
                <span class="status-badge" :class="report.backupDiagnostics.binaryApiStatus === 'PASS' ? 'pass' : 'fail'">
                  {{ report.backupDiagnostics.binaryApiStatus === 'PASS' ? '✅ PASS 可用' : '❌ FAIL' }}
                </span>
                <span class="text-xs text-slate-500 ml-2">readAsBinaryString / writeAsBinaryString</span>
              </div>
              <div class="backup-diag-item">
                <span class="lbl">备份就绪状态：</span>
                <span class="status-badge" :class="report.backupDiagnostics.readiness.status === 'ready' ? 'pass' : report.backupDiagnostics.readiness.status === 'needs-save' ? 'warn' : 'fail'">
                  {{ report.backupDiagnostics.readiness.status === 'ready' ? '✅ READY 就绪' : report.backupDiagnostics.readiness.status === 'needs-save' ? '⚠ NEEDS_SAVE 需先保存' : '❌ UNAVAILABLE 不可用' }}
                </span>
                <span class="text-xs text-amber-700 ml-2">({{ report.backupDiagnostics.readiness.reason }})</span>
              </div>
            </div>
          </div>

          <div class="table-container" style="margin-top: 10px;">
            <table class="diag-table">
              <thead>
                <tr>
                  <th style="width: 240px;">持久化存储项目</th>
                  <th style="width: 120px;">状态</th>
                  <th>实际存储路径</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in report.storagePaths" :key="p.name">
                  <td class="font-bold">{{ p.name }}</td>
                  <td>
                    <span class="status-badge" :class="p.exists ? 'available' : 'partial'">
                      {{ p.exists ? '✅ 存在' : '⚪ 待初始化' }}
                    </span>
                  </td>
                  <td class="msg-cell font-mono text-sm">{{ p.path }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="diag-modal-footer">
        <div class="diag-footer-tip">
          提示：若排版出现异常，可点击右上角【复制诊断报告】直接发送给 AI 助手排查。
        </div>
        <button class="btn-close-footer" @click="$emit('close')">
          完成并关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DiagnosticsReport } from '../types/diagnostics'
import { DiagnosticsService } from '../core/diagnostics/DiagnosticsService'
import { copyTextToClipboard } from '@/shared/utils/stringUtils'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const activeTab = ref<'fs' | 'api' | 'doc' | 'paths'>('fs')
const report = ref<DiagnosticsReport>(DiagnosticsService.runFullDiagnostics())
const copied = ref(false)

function refreshDiagnostics() {
  report.value = DiagnosticsService.runFullDiagnostics()
}

async function copyReportText() {
  const text = DiagnosticsService.generateTextReport(report.value)
  const ok = await copyTextToClipboard(text)
  if (ok) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2500)
  }
}
</script>

<style scoped>
.diag-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 16px;
}

.diag-modal-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 820px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #cbd5e1;
}

.diag-modal-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.diag-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.diag-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diag-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.diag-subtitle {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.diag-btn-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.diag-btn-close:hover {
  color: #334155;
}

.diag-summary-banner {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
}

.diag-summary-banner.healthy { background: #f0fdf4; border-color: #bbf7d0; }
.diag-summary-banner.warning { background: #fffbeb; border-color: #fde68a; }
.diag-summary-banner.error { background: #fef2f2; border-color: #fecaca; }

.diag-banner-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diag-overall-tag {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
}

.diag-overall-tag.healthy { color: #166534; }
.diag-overall-tag.warning { color: #854d0e; }
.diag-overall-tag.error { color: #991b1b; }

.diag-banner-text {
  font-size: 12px;
  color: #475569;
}

.diag-banner-actions {
  display: flex;
  gap: 8px;
}

.btn-refresh-diag, .btn-copy-diag {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-refresh-diag {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.btn-refresh-diag:hover {
  background: #f1f5f9;
}

.btn-copy-diag {
  background: #2563eb;
  border: 1px solid #2563eb;
  color: #ffffff;
}

.btn-copy-diag:hover {
  background: #1d4ed8;
}

.diag-modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.diag-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}

.diag-tab-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid transparent;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}

.diag-tab-btn:hover {
  background: #f1f5f9;
}

.diag-tab-btn.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.pane-hint {
  font-size: 12px;
  color: #64748b;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  border-left: 3px solid #3b82f6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  background: #f8fafc;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.info-item {
  display: flex;
  font-size: 12px;
  gap: 6px;
}

.info-label {
  color: #64748b;
  font-weight: 600;
}

.info-val {
  color: #0f172a;
}

.table-container {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.diag-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.diag-table th {
  background: #f8fafc;
  padding: 8px 12px;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.diag-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.status-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.pass, .status-badge.available, .status-badge.saved { background: #dcfce7; color: #15803d; }
.status-badge.fail, .status-badge.unavailable { background: #fee2e2; color: #b91c1c; }
.status-badge.not_found, .status-badge.partial, .status-badge.not_tested, .status-badge.unsaved, .status-badge.warn { background: #fef3c7; color: #b45309; }
.status-badge.incompatible, .status-badge.not_used, .status-badge.unverified { background: #f1f5f9; color: #64748b; }

.role-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
}

.role-badge.primary { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.role-badge.primary_binary { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.role-badge.unused { background: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0; }

.msg-cell.has-error {
  color: #dc2626;
  font-weight: 600;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.font-bold {
  font-weight: 600;
}

.text-sm {
  font-size: 11px;
}

.diag-modal-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.diag-footer-tip {
  font-size: 11px;
  color: #64748b;
}

.backup-diag-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
}

.backup-diag-title {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.backup-diag-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.backup-diag-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
}

.backup-diag-item .lbl {
  color: #64748b;
  min-width: 90px;
}

.backup-diag-item .val {
  color: #0f172a;
}

.status-badge.unverified {
  background: #f1f5f9;
  color: #64748b;
}

.btn-close-footer {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-close-footer:hover {
  background: #1e293b;
}
</style>
