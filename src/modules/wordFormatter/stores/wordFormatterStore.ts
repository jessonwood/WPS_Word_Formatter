import { defineStore } from 'pinia'
import type { DocumentInfo, DocumentModel } from '../types/document'
import type { RecognitionResult, ParagraphRole, RecognitionStats } from '../types/recognition'
import type { FormatTemplate } from '../types/template'
import type { FormatProgress, FormatResult, FormatScope, AuditReport } from '../types/formatting'
import type { FormatApplyStrategy, FormatPlan, FormatChange, FormatProperty } from '../types/planning'
import type { CleanupIssue, CleanupCategorySummary, CleanupResult } from '../types/cleanup'
import { scanService } from '../services/ScanService'
import { recognitionEngine } from '../core/recognition/RecognitionEngine'
import { templateService } from '../services/TemplateService'
import { formatterService } from '../services/FormatterService'
import { ConfidenceCalculator } from '../core/recognition/ConfidenceCalculator'
import { DocumentAuditor } from '../core/audit/DocumentAuditor'
import { DryRunEngine } from '../core/planning/DryRunEngine'
import { ChangeSetOptimizer } from '../core/planning/ChangeSetOptimizer'
import { CleanupEngine } from '../core/cleanup/CleanupEngine'
import { defaultWriterAdapter } from '../adapters/adapterFactory'
import { logger } from '@/shared/logger/logger'

import { getSavedActiveTemplateId, saveActiveTemplateId } from '@/shared/utils/persistentStorage'

import type { BackupConfig, BackupSummary } from '../types/backup'
import type { DiagnosticsReport } from '../types/diagnostics'
import { DiagnosticsService } from '../core/diagnostics/DiagnosticsService'

export interface WordFormatterState {
  documentInfo: DocumentInfo | null
  documentModel: DocumentModel | null
  recognitionResults: RecognitionResult[]
  allTemplates: FormatTemplate[]
  selectedTemplateId: string
  formatScope: FormatScope
  formatStrategy: FormatApplyStrategy
  currentPlan: FormatPlan | null
  auditReport: AuditReport | null
  cleanupIssues: CleanupIssue[]
  userOverrides: Record<number, ParagraphRole>
  backupConfig: BackupConfig
  backupSummary: BackupSummary | null
  diagnosticsReport: DiagnosticsReport | null
  showDiagnosticsModal: boolean
  showBackupPromptModal: boolean
  backupPromptType: 'needs-save' | 'unavailable'
  backupPromptDocName: string
  backupPromptDocPath: string
  backupPromptResolver: ((decision: 'save-and-continue' | 'skip-backup' | 'cancel') => void) | null
  scanStatus: 'idle' | 'scanning' | 'ready' | 'error'
  formatStatus: 'idle' | 'formatting' | 'success' | 'error'
  cleanupExecuting: boolean
  progress: FormatProgress | null
  lastResult: FormatResult | null
  lastSnapshotAvailable: boolean
  activeTab: 'main' | 'recognition' | 'template' | 'logs'
  errorMessage: string | null
  errorDetails: string | null
}

export const useWordFormatterStore = defineStore('wordFormatter', {
  state: (): WordFormatterState => ({
    documentInfo: null,
    documentModel: null,
    recognitionResults: [],
    allTemplates: templateService.getAllTemplates(),
    selectedTemplateId: getSavedActiveTemplateId(),
    formatScope: 'all',
    formatStrategy: 'minimal',
    currentPlan: null,
    auditReport: null,
    cleanupIssues: [],
    userOverrides: {},
    backupConfig: formatterService.getBackupService().getConfig(),
    backupSummary: formatterService.getBackupService().getSummary(),
    diagnosticsReport: null,
    showDiagnosticsModal: false,
    showBackupPromptModal: false,
    backupPromptType: 'needs-save',
    backupPromptDocName: '',
    backupPromptDocPath: '',
    backupPromptResolver: null,
    scanStatus: 'idle',
    formatStatus: 'idle',
    cleanupExecuting: false,
    progress: null,
    lastResult: null,
    lastSnapshotAvailable: false,
    activeTab: 'main',
    errorMessage: null,
    errorDetails: null
  }),

  getters: {
    selectedTemplate(state): FormatTemplate {
      const found = state.allTemplates.find(t => t.id === state.selectedTemplateId)
      if (found) return found
      return templateService.getTemplateById(state.selectedTemplateId)
    },
    recognitionStats(state): RecognitionStats {
      return ConfidenceCalculator.calculateStats(
        state.recognitionResults,
        state.documentModel?.tableCount || 0
      )
    },
    effectiveRecognition(state): RecognitionResult[] {
      return state.recognitionResults.map(r => {
        if (state.userOverrides[r.paragraphIndex] !== undefined) {
          return {
            ...r,
            role: state.userOverrides[r.paragraphIndex],
            userOverridden: true
          }
        }
        return r
      })
    },
    cleanupCategories(state): CleanupCategorySummary[] {
      const engine = new CleanupEngine(defaultWriterAdapter)
      return engine.getCategorySummaries(state.cleanupIssues)
    }
  },

  actions: {
    refreshTemplates() {
      this.allTemplates = templateService.getAllTemplates()
      const savedId = getSavedActiveTemplateId()
      if (this.allTemplates.some(t => t.id === savedId)) {
        this.selectedTemplateId = savedId
      } else if (!this.allTemplates.some(t => t.id === this.selectedTemplateId)) {
        this.selectedTemplateId = this.allTemplates[0]?.id || 'template-government'
        saveActiveTemplateId(this.selectedTemplateId)
      }

      console.log('[STORE_FINAL] templateIds:', this.allTemplates.map(t => `${t.name} (${t.id})`))
      logger.info('WordFormatterStore', `[STORE_FINAL] templatesCount=${this.allTemplates.length} templateIds=[${this.allTemplates.map(t => t.name).join(', ')}] (active: ${this.selectedTemplateId})`)
    },

    async init() {
      logger.info('WordFormatterStore', 'Initializing store and loading active document info...')
      this.refreshTemplates()
      try {
        const info = await defaultWriterAdapter.getActiveDocumentInfo()
        this.documentInfo = info
        await this.scanDocument()
      } catch (err: any) {
        logger.error('WordFormatterStore', 'Initialization error', err)
        this.errorMessage = err.message || '初始化失败'
      }
    },

    async scanDocument() {
      this.scanStatus = 'scanning'
      this.errorMessage = null
      this.errorDetails = null

      try {
        const docInfo = await defaultWriterAdapter.getActiveDocumentInfo()
        this.documentInfo = docInfo

        const model = await scanService.getCurrentDocumentModel()
        this.documentModel = model

        const customRules = this.selectedTemplate?.customRecognitionRules
        const results = recognitionEngine.analyze(model, customRules)
        this.recognitionResults = results

        this.auditReport = DocumentAuditor.audit(model, results, this.selectedTemplate)

        const cleanupEngine = new CleanupEngine(defaultWriterAdapter)
        this.cleanupIssues = cleanupEngine.scan(model)

        this.refreshBackups()

        this.scanStatus = 'ready'
        logger.info('WordFormatterStore', `Document scanned: ${results.length} paragraphs, ${this.cleanupIssues.length} cleanup issues (Health score: ${this.auditReport.score})`)
      } catch (err: any) {
        this.scanStatus = 'error'
        this.errorMessage = err.message || '文档扫描识别失败'
        this.errorDetails = err.details || (err.stack ? String(err.stack) : null)
        logger.error('WordFormatterStore', 'Scan document failed', err)
      }
    },

    setFormatScope(scope: FormatScope) {
      this.formatScope = scope
      logger.info('WordFormatterStore', `Set format scope: ${scope}`)
      if (this.currentPlan) this.generatePlan()
    },

    setFormatStrategy(strategy: FormatApplyStrategy) {
      this.formatStrategy = strategy
      logger.info('WordFormatterStore', `Set format strategy: ${strategy}`)
      if (this.currentPlan) this.generatePlan()
    },

    generatePlan(): FormatPlan | null {
      if (!this.documentModel) {
        logger.warn('WordFormatterStore', 'Cannot generate plan: no documentModel')
        return null
      }

      const plan = DryRunEngine.preview({
        document: this.documentModel,
        recognition: this.recognitionResults,
        userOverrides: this.userOverrides,
        template: this.selectedTemplate,
        strategy: this.formatStrategy,
        scope: this.formatScope
      })

      this.currentPlan = plan
      return plan
    },

    setPlanCategoryEnabled(category: FormatChange['category'], enabled: boolean) {
      if (this.currentPlan) ChangeSetOptimizer.setCategoryEnabled(this.currentPlan, category, enabled)
    },

    setPlanPropertyEnabled(property: FormatProperty, enabled: boolean) {
      if (this.currentPlan) ChangeSetOptimizer.setPropertyEnabled(this.currentPlan, property, enabled)
    },

    setPlanChangeEnabled(changeId: string, enabled: boolean) {
      if (this.currentPlan) ChangeSetOptimizer.setChangeEnabled(this.currentPlan, changeId, enabled)
    },

    setUserOverride(paragraphIndex: number, role: ParagraphRole) {
      this.userOverrides[paragraphIndex] = role
      logger.info('WordFormatterStore', `Set user override for P${paragraphIndex} -> ${role}`)
      if (this.currentPlan) this.generatePlan()
    },

    clearUserOverrides() {
      this.userOverrides = {}
      if (this.currentPlan) this.generatePlan()
    },

    setSelectedTemplate(id: string) {
      this.selectedTemplateId = id
      saveActiveTemplateId(id)
      logger.info('WordFormatterStore', `Selected template: ${id}`)
      if (this.documentModel && this.recognitionResults.length > 0) {
        this.auditReport = DocumentAuditor.audit(this.documentModel, this.recognitionResults, this.selectedTemplate)
        if (this.currentPlan) this.generatePlan()
      }
    },

    cloneTemplate(baseTemplate: FormatTemplate): FormatTemplate {
      const cloned = templateService.createTemplate({ ...baseTemplate, name: `${baseTemplate.name} (副本)` })
      this.refreshTemplates()
      this.setSelectedTemplate(cloned.id)
      return cloned
    },

    createCustomTemplate(name?: string): FormatTemplate {
      const newTpl = templateService.createBlankTemplate(name)
      this.refreshTemplates()
      this.setSelectedTemplate(newTpl.id)
      return newTpl
    },

    saveCustomTemplate(template: FormatTemplate): boolean {
      const ok = templateService.updateTemplate(template)
      this.refreshTemplates()
      this.setSelectedTemplate(template.id)
      return ok
    },

    deleteCustomTemplate(id: string): boolean {
      const ok = templateService.deleteTemplate(id)
      this.refreshTemplates()
      if (this.selectedTemplateId === id) this.setSelectedTemplate('template-government')
      return ok
    },

    async executeFormat() {
      if (!this.documentModel) await this.scanDocument()
      if (!this.documentModel) {
        this.errorMessage = '无可用文档数据，请先扫描文档'
        return
      }

      this.formatStatus = 'formatting'
      this.errorMessage = null
      this.errorDetails = null

      try {
        const isChanged = await scanService.checkDocumentChanged(this.documentModel.signature)
        if (isChanged) {
          logger.warn('WordFormatterStore', 'Document text signature changed, auto re-scanning...')
          await this.scanDocument()
        }

        const template = this.selectedTemplate

        if (
          !this.currentPlan ||
          this.currentPlan.documentSignature !== this.documentModel!.signature ||
          this.currentPlan.strategy !== this.formatStrategy ||
          this.currentPlan.scope !== this.formatScope
        ) {
          logger.info('WordFormatterStore', 'Generating fresh FormatPlan before execution...')
          this.generatePlan()
        }

        let skipPhysicalBackup = false
        if (this.backupConfig.enabled) {
          const docInfo = await defaultWriterAdapter.getActiveDocumentInfo()
          if (docInfo) this.documentInfo = docInfo
          const backupService = formatterService.getBackupService()
          const readiness = backupService.getReadiness(this.documentInfo)

          if (readiness.status === 'needs-save' || readiness.status === 'unavailable') {
            const decision = await this.requestBackupDecision(readiness)
            if (decision === 'cancel') {
              this.formatStatus = 'idle'
              return
            } else if (decision === 'save-and-continue') {
              const saveOk = await defaultWriterAdapter.saveActiveDocument()
              if (saveOk) {
                const updatedDocInfo = await defaultWriterAdapter.getActiveDocumentInfo()
                if (updatedDocInfo) this.documentInfo = updatedDocInfo
              }
            } else if (decision === 'skip-backup') {
              skipPhysicalBackup = true
            }
          }
        }

        const result = await formatterService.executeFormat(
          this.documentModel!,
          this.recognitionResults,
          this.userOverrides,
          template,
          this.formatScope,
          this.formatStrategy,
          this.currentPlan || undefined,
          (prog) => { this.progress = prog },
          skipPhysicalBackup
        )

        this.lastResult = result
        this.lastSnapshotAvailable = true
        this.formatStatus = 'success'
        this.currentPlan = null
        this.refreshBackups()

        if (this.auditReport) {
          this.auditReport = { ...this.auditReport, score: 100, grade: 'excellent', totalIssues: 0, issues: [] }
        }

        logger.info('WordFormatterStore', 'Format executed successfully', result)
      } catch (err: any) {
        this.formatStatus = 'error'
        this.errorMessage = err.message || '排版执行失败'
        this.errorDetails = err.details || (err.stack ? String(err.stack) : null)
        logger.error('WordFormatterStore', 'Format execution failed', err)
      }
    },

    async requestBackupDecision(readiness: import('../types/backup').BackupReadinessResult): Promise<'save-and-continue' | 'skip-backup' | 'cancel'> {
      this.backupPromptType = readiness.status === 'needs-save' ? 'needs-save' : 'unavailable'
      this.backupPromptDocName = this.documentInfo?.name || '当前文档'
      this.backupPromptDocPath = this.documentInfo?.path || ''
      this.showBackupPromptModal = true

      return new Promise<'save-and-continue' | 'skip-backup' | 'cancel'>((resolve) => {
        this.backupPromptResolver = (decision) => {
          this.showBackupPromptModal = false
          this.backupPromptResolver = null
          resolve(decision)
        }
      })
    },

    resolveBackupDecision(decision: 'save-and-continue' | 'skip-backup' | 'cancel') {
      if (this.backupPromptResolver) this.backupPromptResolver(decision)
      else this.showBackupPromptModal = false
    },

    async undoFormat() {
      try {
        const ok = await formatterService.undoLastFormat()
        if (ok) {
          this.lastSnapshotAvailable = false
          this.formatStatus = 'idle'
          this.lastResult = null
          await this.scanDocument()
          logger.info('WordFormatterStore', 'Undo completed successfully')
        }
      } catch (err: any) {
        this.errorMessage = err.message || '撤销排版失败'
        logger.error('WordFormatterStore', 'Undo failed', err)
      }
    },

    async selectParagraphInDoc(index: number) {
      await defaultWriterAdapter.selectParagraph(index)
    },

    async executeCleanup(issues: CleanupIssue[]): Promise<CleanupResult> {
      if (!this.documentModel) await this.scanDocument()
      if (!this.documentModel) return { success: false, appliedCount: 0, failedCount: 0, error: '无可用文档数据' }

      this.cleanupExecuting = true
      this.errorMessage = null
      this.errorDetails = null

      try {
        let skipPhysicalBackup = false
        if (this.backupConfig.enabled && issues.length > 0) {
          const docInfo = await defaultWriterAdapter.getActiveDocumentInfo()
          if (docInfo) this.documentInfo = docInfo
          const backupService = formatterService.getBackupService()
          const readiness = backupService.getReadiness(this.documentInfo)

          if (readiness.status === 'needs-save' || readiness.status === 'unavailable') {
            const decision = await this.requestBackupDecision(readiness)
            if (decision === 'cancel') {
              return { success: false, appliedCount: 0, failedCount: 0, error: '用户取消了清理操作' }
            } else if (decision === 'save-and-continue') {
              const saveOk = await defaultWriterAdapter.saveActiveDocument()
              if (saveOk) {
                const updatedDocInfo = await defaultWriterAdapter.getActiveDocumentInfo()
                if (updatedDocInfo) this.documentInfo = updatedDocInfo
              }
            } else if (decision === 'skip-backup') {
              skipPhysicalBackup = true
            }
          }

          if (!skipPhysicalBackup) {
            const backupRes = await backupService.backupBeforeFormat(this.documentInfo, true, false)
            if (!backupRes.success && backupRes.skippedReason !== 'skipped-by-user') {
              this.errorMessage = backupRes.error || '清理前自动备份失败'
              return { success: false, appliedCount: 0, failedCount: issues.length, error: this.errorMessage }
            }
          }
        }

        const engine = new CleanupEngine(defaultWriterAdapter)
        const result = await engine.execute(this.documentModel, issues)
        if (result.success) {
          this.lastSnapshotAvailable = true
          await this.scanDocument()
          this.refreshBackups()
        } else if (result.error) {
          this.errorMessage = result.error
        }
        return result
      } catch (err: any) {
        this.errorMessage = err.message || '文档清理执行失败'
        return { success: false, appliedCount: 0, failedCount: issues.length, error: this.errorMessage || '未知错误' }
      } finally {
        this.cleanupExecuting = false
      }
    },

    updateBackupConfig(partial: Partial<BackupConfig>) {
      formatterService.getBackupService().updateConfig(partial)
      this.backupConfig = formatterService.getBackupService().getConfig()
      this.refreshBackups()
    },

    refreshBackups() {
      this.backupSummary = formatterService.getBackupService().getSummary(this.documentInfo)
    },

    openDiagnosticsModal() {
      this.diagnosticsReport = DiagnosticsService.runFullDiagnostics()
      this.showDiagnosticsModal = true
    },

    closeDiagnosticsModal() {
      this.showDiagnosticsModal = false
    },

    runDiagnostics(): DiagnosticsReport {
      const rep = DiagnosticsService.runFullDiagnostics()
      this.diagnosticsReport = rep
      return rep
    }
  }
})
