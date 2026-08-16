import type { FormatTemplate } from '../types/template'
import { templateRepository, TemplateRepository } from '../templates/templateRepository'

export class TemplateService {
  constructor(private repo: TemplateRepository = templateRepository) {}

  getAllTemplates(): FormatTemplate[] {
    return this.repo.getAll()
  }

  getTemplateById(id: string): FormatTemplate {
    const template = this.repo.getById(id)
    if (!template) {
      return this.repo.getAll()[0]
    }
    return template
  }

  createTemplate(base: Partial<FormatTemplate> & { name: string }): FormatTemplate {
    const defaultTpl = this.getTemplateById('template-government')
    const newTemplate: FormatTemplate = {
      ...defaultTpl,
      ...base,
      id: `template-custom-${Date.now()}`,
      isBuiltIn: false,
      version: 1
    }
    this.repo.save(newTemplate)
    return newTemplate
  }

  createBlankTemplate(name = '新建自定义模板'): FormatTemplate {
    const allCustoms = this.repo.getAll().filter(t => !t.isBuiltIn)
    const suffix = allCustoms.length > 0 ? ` (${allCustoms.length + 1})` : ''
    return this.createTemplate({
      name: `${name}${suffix}`,
      description: '用户自定义排版样式模板',
      customHeadings: [],
      customRecognitionRules: []
    })
  }

  updateTemplate(template: FormatTemplate): boolean {
    return this.repo.save(template)
  }

  deleteTemplate(id: string): boolean {
    return this.repo.delete(id)
  }

  exportTemplate(template: FormatTemplate): string {
    return this.repo.exportToJson(template)
  }

  importTemplate(jsonStr: string): FormatTemplate | null {
    return this.repo.importFromJson(jsonStr)
  }
}

export const templateService = new TemplateService()
