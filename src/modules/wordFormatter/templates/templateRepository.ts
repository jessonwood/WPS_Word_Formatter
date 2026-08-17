import type { FormatTemplate } from '../types/template'
import { defaultTemplate } from './default'
import { governmentTemplate } from './government'
import { bankReportTemplate } from './bankReport'
import { simpleReportTemplate } from './simpleReport'
import {
  ordinaryOfficialDocumentTemplate,
  regulationTemplate,
  businessOperationTemplate
} from './documentProcessing2025'
import { logger } from '@/shared/logger/logger'
import { loadCustomTemplatesFromDisk, saveCustomTemplatesToDisk } from '@/shared/utils/persistentStorage'

export function validateTemplate(t: any): boolean {
  if (!t || typeof t !== 'object') return false
  if (typeof t.id !== 'string' || !t.id) return false
  if (typeof t.name !== 'string' || !t.name) return false
  if (!t.page || typeof t.page !== 'object') return false
  if (!t.body || typeof t.body !== 'object') return false
  return true
}

export class TemplateRepository {
  private builtInTemplates: FormatTemplate[] = [
    governmentTemplate,
    ordinaryOfficialDocumentTemplate,
    regulationTemplate,
    businessOperationTemplate,
    bankReportTemplate,
    defaultTemplate,
    simpleReportTemplate
  ]

  loadBuiltinTemplates(): FormatTemplate[] {
    return this.builtInTemplates.map(t => ({ ...t, isBuiltIn: true }))
  }

  getAll(): FormatTemplate[] {
    const builtin = this.loadBuiltinTemplates()
    const rawCustom = loadCustomTemplatesFromDisk()
    const validCustom = rawCustom.filter(t => validateTemplate(t))

    console.log('[STORE_INIT] beforeMerge:', {
      builtinCount: builtin.length,
      customCount: validCustom.length,
      customNames: validCustom.map(t => t.name)
    })

    const merged = [...builtin, ...validCustom]

    console.log('[STORE_INIT] afterMerge:', {
      totalCount: merged.length,
      templateIds: merged.map(t => `${t.name} (${t.id})`)
    })

    return merged
  }

  getById(id: string): FormatTemplate | undefined {
    const all = this.getAll()
    return all.find(t => t.id === id) || this.builtInTemplates[0]
  }

  save(template: FormatTemplate): boolean {
    try {
      const rawCustom = loadCustomTemplatesFromDisk()
      const custom = rawCustom.filter(t => validateTemplate(t))
      const existingIdx = custom.findIndex(t => t.id === template.id)
      
      const target: FormatTemplate = { 
        ...template, 
        isBuiltIn: false 
      }

      if (existingIdx >= 0) {
        custom[existingIdx] = target
      } else {
        custom.push(target)
      }

      const ok = saveCustomTemplatesToDisk(custom, target.id)
      if (ok) {
        logger.info('TemplateRepository', `Successfully saved custom template: ${target.name} (${target.id})`)
      } else {
        logger.error('TemplateRepository', `Failed to persist custom template to disk: ${target.name}`)
      }
      return ok
    } catch (e) {
      logger.error('TemplateRepository', 'Failed to save custom template', e)
      return false
    }
  }

  delete(id: string): boolean {
    try {
      const rawCustom = loadCustomTemplatesFromDisk()
      const custom = rawCustom.filter(t => validateTemplate(t))
      const filtered = custom.filter(t => t.id !== id)
      const ok = saveCustomTemplatesToDisk(filtered)
      if (ok) {
        logger.info('TemplateRepository', `Deleted custom template: ${id}`)
      }
      return ok
    } catch (e) {
      logger.error('TemplateRepository', `Failed to delete template ${id}`, e)
      return false
    }
  }

  exportToJson(template: FormatTemplate): string {
    return JSON.stringify(template, null, 2)
  }

  importFromJson(jsonStr: string): FormatTemplate | null {
    try {
      const parsed = JSON.parse(jsonStr) as FormatTemplate
      if (!validateTemplate(parsed)) {
        throw new Error('无效的模板配置结构')
      }
      parsed.id = `template-custom-${Date.now()}`
      parsed.isBuiltIn = false
      const ok = this.save(parsed)
      if (ok) return parsed
      return null
    } catch (e) {
      logger.error('TemplateRepository', 'Failed to parse and import template JSON', e)
      return null
    }
  }
}

export const templateRepository = new TemplateRepository()
