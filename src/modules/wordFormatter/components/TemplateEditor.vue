<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useWordFormatterStore } from '../stores/wordFormatterStore'
import { templateService } from '../services/TemplateService'
import type { FormatTemplate, CustomHeadingLevel, CustomRecognitionRule, ParagraphStyle, HeadingDefinition } from '../types/template'
import { CHINESE_FONT_SIZES } from '@/shared/utils/fontUtils'
import { X, Copy, Trash2, Download, Save, Check, Layers, Plus, Bold, Code2, Sparkles, TestTube } from 'lucide-vue-next'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useWordFormatterStore()

export interface HeadingItem {
  id: string
  level: number
  name: string
  patternPreset: string
  customPattern: string
  style: ParagraphStyle
}

const PATTERN_PRESETS = [
  { label: '一、 (中文大写)', value: 'cn-number', pattern: '^[一二三四五六七八九十百零〇]+[、．.]\\s*(.*)$' },
  { label: '第一条 (条款)', value: 'clause', pattern: '^【?第[一二三四五六七八九十百]+条】?\\s*(.*)$' },
  { label: '第一章 (章节)', value: 'chapter', pattern: '^第[一二三四五六七八九十百]+章\\s+(.*)$' },
  { label: '（一） (括号中文)', value: 'paren-cn', pattern: '^[（(][一二三四五六七八九十]+[)）]\\s*(.*)$' },
  { label: '1. (阿拉伯数字)', value: 'num-dot', pattern: '^\\d+[、．.]\\s*(.*)$' },
  { label: '(1) (括号数字)', value: 'paren-num', pattern: '^[（(]\\d+[)）]\\s*(.*)$' },
  { label: '1.1 (多级数字)', value: 'num-multi', pattern: '^\\d+\\.\\d+(?:\\.\\d+)*\\s*(.*)$' },
  { label: '① (圈数字)', value: 'circle-num', pattern: '^[①②③④⑤⑥⑦⑧⑨⑩]\\s*(.*)$' },
  { label: '自定义正则规则...', value: 'custom', pattern: '' }
]

function detectPreset(pattern?: string): string {
  if (!pattern) return 'custom'
  if (pattern.includes('条')) return 'clause'
  if (pattern.includes('章')) return 'chapter'
  if (pattern.includes('一二三四') && pattern.includes('（')) return 'paren-cn'
  if (pattern.includes('一二三四')) return 'cn-number'
  if (pattern.includes('\\d+\\.\\d+')) return 'num-multi'
  if (pattern.includes('\\d+') && pattern.includes('（')) return 'paren-num'
  if (pattern.includes('\\d+')) return 'num-dot'
  if (pattern.includes('①')) return 'circle-num'
  return 'custom'
}

const currentTemplate = ref<FormatTemplate>(JSON.parse(JSON.stringify(store.selectedTemplate)))
const headingList = ref<HeadingItem[]>([])

function loadHeadingList(tpl: FormatTemplate) {
  if (!tpl) return
  if (tpl.headings && tpl.headings.length > 0) {
    headingList.value = tpl.headings.map((h, idx) => ({
      id: `heading-${idx + 1}-${Date.now()}-${Math.random()}`,
      level: idx + 1,
      name: h.name || `${idx + 1}级标题`,
      patternPreset: detectPreset(h.pattern),
      customPattern: h.pattern || '',
      style: JSON.parse(JSON.stringify(h.style))
    }))
    return
  }

  const list: HeadingItem[] = []
  if (tpl.heading1) {
    list.push({
      id: `heading-1-${Date.now()}`,
      level: 1,
      name: '一级标题 (一、)',
      patternPreset: 'cn-number',
      customPattern: '^[一二三四五六七八九十百零〇]+[、．.]\\s*(.*)$',
      style: JSON.parse(JSON.stringify(tpl.heading1))
    })
  }
  if (tpl.heading2) {
    list.push({
      id: `heading-2-${Date.now()}`,
      level: 2,
      name: '二级标题 (（一）)',
      patternPreset: 'paren-cn',
      customPattern: '^[（(][一二三四五六七八九十]+[)）]\\s*(.*)$',
      style: JSON.parse(JSON.stringify(tpl.heading2))
    })
  }
  if (tpl.heading3) {
    list.push({
      id: `heading-3-${Date.now()}`,
      level: 3,
      name: '三级标题 (1.)',
      patternPreset: 'num-dot',
      customPattern: '^\\d+[、．.]\\s*(.*)$',
      style: JSON.parse(JSON.stringify(tpl.heading3))
    })
  }
  if (tpl.heading4) {
    list.push({
      id: `heading-4-${Date.now()}`,
      level: 4,
      name: '四级标题 ( (1) )',
      patternPreset: 'paren-num',
      customPattern: '^[（(]\\d+[)）]\\s*(.*)$',
      style: JSON.parse(JSON.stringify(tpl.heading4))
    })
  }
  if (tpl.customHeadings && tpl.customHeadings.length > 0) {
    tpl.customHeadings.forEach((ch, cIdx) => {
      list.push({
        id: `heading-${5 + cIdx}-${Date.now()}`,
        level: 5 + cIdx,
        name: ch.name || `${5 + cIdx}级标题 ( ① )`,
        patternPreset: 'circle-num',
        customPattern: '^[①②③④⑤⑥⑦⑧⑨⑩]\\s*(.*)$',
        style: JSON.parse(JSON.stringify(ch.style))
      })
    })
  }
  if (list.length === 0 && tpl.body) {
    list.push({
      id: `heading-1-${Date.now()}`,
      level: 1,
      name: '一级标题 (一、)',
      patternPreset: 'cn-number',
      customPattern: '^[一二三四五六七八九十百零〇]+[、．.]\\s*(.*)$',
      style: JSON.parse(JSON.stringify(tpl.body))
    })
  }
  headingList.value = list
}

function syncHeadingListToTemplate(tpl: FormatTemplate) {
  if (!tpl || headingList.value.length === 0) return
  
  tpl.headings = headingList.value.map(h => ({
    level: h.level,
    name: h.name,
    pattern: h.patternPreset === 'custom' ? h.customPattern : (PATTERN_PRESETS.find(p => p.value === h.patternPreset)?.pattern || h.customPattern),
    style: h.style
  }))

  tpl.heading1 = headingList.value[0]?.style || tpl.body
  tpl.heading2 = headingList.value[1]?.style
  tpl.heading3 = headingList.value[2]?.style
  tpl.heading4 = headingList.value[3]?.style
  tpl.customHeadings = headingList.value.slice(4).map(h => ({
    level: h.level,
    name: h.name,
    style: h.style
  }))

  if (!tpl.customRecognitionRules) {
    tpl.customRecognitionRules = []
  }

  // Auto register recognition rules for clause/chapter/custom pattern
  headingList.value.forEach((h, idx) => {
    const activePattern = h.patternPreset === 'custom' ? h.customPattern : (PATTERN_PRESETS.find(p => p.value === h.patternPreset)?.pattern || h.customPattern)
    if (activePattern && (h.patternPreset === 'clause' || h.patternPreset === 'chapter' || h.patternPreset === 'custom')) {
      const role = `heading-${idx + 1}` as any
      const existing = tpl.customRecognitionRules!.find(r => r.id === `heading-rule-level-${idx + 1}`)
      if (existing) {
        existing.name = h.name
        existing.pattern = activePattern
        existing.role = role
        existing.enabled = true
      } else {
        tpl.customRecognitionRules!.unshift({
          id: `heading-rule-level-${idx + 1}`,
          name: h.name,
          pattern: activePattern,
          role,
          enabled: true
        })
      }
    }
  })
}

function ensureHeadingDefaults(tpl: FormatTemplate) {
  if (!tpl) return
  if (!tpl.customHeadings) {
    tpl.customHeadings = []
  }
  if (!tpl.customRecognitionRules) {
    tpl.customRecognitionRules = []
  }
  loadHeadingList(tpl)
  headingList.value.forEach(item => {
    if (!item.style.alignment) item.style.alignment = 'left'
  })
}

ensureHeadingDefaults(currentTemplate.value)

const jsonModalOpen = ref(false)
const jsonContent = ref('')
const saveSuccessMessage = ref<string | null>(null)

// Custom Rule Live Tester
const testInputText = ref('')
const testResult = computed(() => {
  if (!testInputText.value.trim()) return null
  const rules = currentTemplate.value.customRecognitionRules || []
  for (const r of rules) {
    if (r.enabled && r.pattern) {
      try {
        const regex = new RegExp(r.pattern)
        if (regex.test(testInputText.value.trim())) {
          return {
            matched: true,
            ruleName: r.name,
            role: r.role
          }
        }
      } catch {}
    }
  }
  return { matched: false, ruleName: '', role: '' }
})

const customRuleRoles = [
  { label: '一级标题 (heading-1)', value: 'heading-1' },
  { label: '二级标题 (heading-2)', value: 'heading-2' },
  { label: '三级标题 (heading-3)', value: 'heading-3' },
  { label: '四级标题 (heading-4)', value: 'heading-4' },
  { label: '五级标题 (heading-5)', value: 'heading-5' },
  { label: '六级标题 (heading-6)', value: 'heading-6' },
  { label: '正文段落 (body)', value: 'body' },
  { label: '附件条目 (attachment-title)', value: 'attachment-title' },
  { label: '图表标题 (table-caption)', value: 'table-caption' }
]

const onHeadingPresetChange = (item: HeadingItem) => {
  const found = PATTERN_PRESETS.find(p => p.value === item.patternPreset)
  if (found && found.value !== 'custom') {
    item.customPattern = found.pattern
    if (item.patternPreset === 'clause') {
      item.name = `${item.level}级标题 (第一条)`
    } else if (item.patternPreset === 'chapter') {
      item.name = `${item.level}级标题 (第一章)`
    } else if (item.patternPreset === 'cn-number') {
      item.name = `${item.level}级标题 (一、)`
    } else if (item.patternPreset === 'paren-cn') {
      item.name = `${item.level}级标题 (（一）)`
    } else if (item.patternPreset === 'num-dot') {
      item.name = `${item.level}级标题 (1.)`
    } else if (item.patternPreset === 'paren-num') {
      item.name = `${item.level}级标题 ( (1) )`
    } else if (item.patternPreset === 'num-multi') {
      item.name = `${item.level}级标题 (1.1)`
    } else if (item.patternPreset === 'circle-num') {
      item.name = `${item.level}级标题 ( ① )`
    }
  }
}

const handleAddHeadingLevel = () => {
  const currentCount = headingList.value.length
  const nextLevel = currentCount + 1
  const prevStyle = currentCount > 0 ? headingList.value[currentCount - 1].style : (currentTemplate.value.body || { chineseFont: '黑体', fontSizePt: 16 })
  
  const presetKey = nextLevel === 2 ? 'paren-cn' : (nextLevel === 3 ? 'num-dot' : (nextLevel === 4 ? 'paren-num' : 'circle-num'))
  const defaultPreset = PATTERN_PRESETS.find(p => p.value === presetKey)

  headingList.value.push({
    id: `heading-${nextLevel}-${Date.now()}`,
    level: nextLevel,
    name: `${nextLevel}级标题`,
    patternPreset: presetKey,
    customPattern: defaultPreset?.pattern || '',
    style: {
      ...JSON.parse(JSON.stringify(prevStyle)),
      outlineLevel: Math.min(9, nextLevel),
      bold: false
    }
  })
}

const handleRemoveHeadingLevel = (index: number) => {
  if (headingList.value.length <= 1) {
    alert('模板至少需要保留一个标题等级！')
    return
  }
  const removedName = headingList.value[index].name
  if (confirm(`确定删除「${removedName}」吗？删除后后续标题等级将自动递进对齐。`)) {
    headingList.value.splice(index, 1)
    headingList.value.forEach((h, idx) => {
      h.level = idx + 1
      h.style.outlineLevel = Math.min(9, idx + 1)
    })
  }
}

const handleAddCustomRule = () => {
  ensureHeadingDefaults(currentTemplate.value)
  currentTemplate.value.customRecognitionRules!.push({
    id: 'rule_' + Date.now(),
    name: `规则 ${currentTemplate.value.customRecognitionRules!.length + 1}`,
    pattern: '^【第[一二三四五六七八九十百]+条】',
    role: 'heading-1',
    enabled: true
  })
}

const handleRemoveCustomRule = (index: number) => {
  if (currentTemplate.value.customRecognitionRules) {
    currentTemplate.value.customRecognitionRules.splice(index, 1)
  }
}

const applyRulePreset = (presetKey: string) => {
  ensureHeadingDefaults(currentTemplate.value)
  if (presetKey === 'clause') {
    currentTemplate.value.customRecognitionRules!.push({
      id: 'rule_' + Date.now(),
      name: '【第X条】条款',
      pattern: '^【第[一二三四五六七八九十百]+条】',
      role: 'heading-1',
      enabled: true
    })
  } else if (presetKey === 'chapter') {
    currentTemplate.value.customRecognitionRules!.push({
      id: 'rule_' + Date.now(),
      name: '第X章 章节',
      pattern: '^第[一二三四五六七八九十百]+章\\s+',
      role: 'heading-1',
      enabled: true
    })
  } else if (presetKey === 'case') {
    currentTemplate.value.customRecognitionRules!.push({
      id: 'rule_' + Date.now(),
      name: 'Case X: 案例',
      pattern: '^Case\\s+\\d+:',
      role: 'heading-2',
      enabled: true
    })
  } else if (presetKey === 'num4') {
    currentTemplate.value.customRecognitionRules!.push({
      id: 'rule_' + Date.now(),
      name: '1.1.1.1 序号',
      pattern: '^\\d+\\.\\d+\\.\\d+\\.\\d+',
      role: 'heading-4',
      enabled: true
    })
  }
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      store.refreshTemplates()
      currentTemplate.value = JSON.parse(JSON.stringify(store.selectedTemplate))
      ensureHeadingDefaults(currentTemplate.value)
      saveSuccessMessage.value = null
    }
  }
)

const fontList = [
  '方正小标宋简体',
  '黑体',
  '楷体_GB2312',
  '仿宋_GB2312',
  '宋体',
  '微软雅黑',
  'Arial',
  'Times New Roman'
]

const onSelectTplChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const id = target.value
  store.setSelectedTemplate(id)
  const found = store.allTemplates.find(t => t.id === id)
  if (found) {
    currentTemplate.value = JSON.parse(JSON.stringify(found))
    ensureHeadingDefaults(currentTemplate.value)
  }
  saveSuccessMessage.value = null
}

const handleSave = () => {
  if (currentTemplate.value.isBuiltIn) {
    alert('内置模板不可直接覆盖，请点击「复制为自定义」或「新建模板」后再进行修改保存！')
    return
  }
  syncHeadingListToTemplate(currentTemplate.value)
  const ok = store.saveCustomTemplate(currentTemplate.value)
  if (ok) {
    saveSuccessMessage.value = '模板修改保存成功！'
    setTimeout(() => {
      saveSuccessMessage.value = null
      emit('close')
    }, 600)
  } else {
    alert('保存失败：未能成功写入本地 templates.json，请查看运行日志获取具体错误。')
  }
}

const handleCreateNew = () => {
  const newTpl = store.createCustomTemplate('新建自定义模板')
  currentTemplate.value = JSON.parse(JSON.stringify(newTpl))
  ensureHeadingDefaults(currentTemplate.value)
  saveSuccessMessage.value = `已成功创建新模板「${newTpl.name}」，可直接修改下方参数并保存！`
  setTimeout(() => {
    saveSuccessMessage.value = null
  }, 2500)
}

const handleClone = () => {
  syncHeadingListToTemplate(currentTemplate.value)
  const cloned = store.cloneTemplate(currentTemplate.value)
  currentTemplate.value = JSON.parse(JSON.stringify(cloned))
  ensureHeadingDefaults(currentTemplate.value)
  saveSuccessMessage.value = `已成功创建自定义副本「${cloned.name}」`
  setTimeout(() => {
    saveSuccessMessage.value = null
  }, 2000)
}

const handleDelete = () => {
  if (currentTemplate.value.isBuiltIn) {
    alert('内置模板不可删除')
    return
  }
  if (confirm(`确定删除自定义模板「${currentTemplate.value.name}」吗？`)) {
    store.deleteCustomTemplate(currentTemplate.value.id)
    currentTemplate.value = JSON.parse(JSON.stringify(store.selectedTemplate))
    ensureHeadingDefaults(currentTemplate.value)
  }
}

const handleExportJson = () => {
  syncHeadingListToTemplate(currentTemplate.value)
  jsonContent.value = templateService.exportTemplate(currentTemplate.value)
  jsonModalOpen.value = true
}

const handleImportJson = () => {
  try {
    const imported = templateService.importTemplate(jsonContent.value)
    if (imported) {
      store.refreshTemplates()
      store.setSelectedTemplate(imported.id)
      currentTemplate.value = JSON.parse(JSON.stringify(imported))
      ensureHeadingDefaults(currentTemplate.value)
      jsonModalOpen.value = false
      alert('模板导入成功！')
    }
  } catch (e: any) {
    alert('导入失败：' + e.message)
  }
}
</script>

<template>
  <div v-if="props.show" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-left">
          <Layers class="w-4 h-4 text-blue-600" />
          <h3 class="modal-title">模板参数设置与管理</h3>
        </div>
        <button class="btn-close" @click="emit('close')">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Save Success Toast -->
      <div v-if="saveSuccessMessage" class="save-toast">
        <Check class="w-3.5 h-3.5 mr-1 inline text-green-600" />
        <span>{{ saveSuccessMessage }}</span>
      </div>

      <!-- Modal Body (TaskPane-Native layout) -->
      <div class="modal-body">
        <!-- 1. Top Template Switcher & Actions -->
        <div class="tpl-selector-card">
          <div class="selector-label">选择要编辑或查看的模板：</div>
          <div class="selector-row">
            <select :value="currentTemplate.id" class="tpl-select-main" @change="onSelectTplChange">
              <option v-for="tpl in store.allTemplates" :key="tpl.id" :value="tpl.id">
                {{ tpl.name }} {{ tpl.isBuiltIn ? '（内置）' : '（自定义）' }}
              </option>
            </select>
          </div>

          <!-- Template action buttons -->
          <div class="tpl-action-buttons">
            <button class="btn-action-pill btn-create-pill" @click="handleCreateNew" title="创建全新的空白/自定义排版模板">
              <Plus class="w-3.5 h-3.5 inline mr-1" />
              <span>新建模板</span>
            </button>
            <button class="btn-action-pill btn-clone-pill" @click="handleClone" title="以当前选中的模板为基准复制副本">
              <Copy class="w-3.5 h-3.5 inline mr-1" />
              <span>复制副本</span>
            </button>
            <button v-if="!currentTemplate.isBuiltIn" class="btn-action-pill btn-del-pill" @click="handleDelete" title="删除当前自定义模板">
              <Trash2 class="w-3.5 h-3.5 inline mr-1" />
              <span>删除模板</span>
            </button>
            <button class="btn-action-pill" @click="handleExportJson" title="查看或导入JSON配置">
              <Download class="w-3.5 h-3.5 inline mr-1" />
              <span>JSON导入/导出</span>
            </button>
          </div>
        </div>

        <!-- 2. Form Content -->
        <div class="form-fields-container">
          <!-- Template Name -->
          <div class="form-group-card">
            <div class="form-row-between">
              <label class="group-title">模板名称</label>
              <span v-if="currentTemplate.isBuiltIn" class="tag-builtin-tip">内置不可直接改名</span>
              <span v-else class="tag-custom-badge">自定义模板</span>
            </div>
            <input 
              v-model="currentTemplate.name" 
              type="text" 
              class="form-input" 
              :disabled="currentTemplate.isBuiltIn"
              placeholder="请输入模板名称"
            />
          </div>

          <!-- Page Settings -->
          <div class="form-group-card">
            <div class="group-title">版心与边距设置 (单位: pt)</div>
            <div class="form-grid-2">
              <div class="field-item">
                <span class="sub-label">上边距 (pt)</span>
                <input v-model.number="currentTemplate.page.topMarginPt" type="number" class="form-input-sm" :disabled="currentTemplate.isBuiltIn" />
              </div>
              <div class="field-item">
                <span class="sub-label">下边距 (pt)</span>
                <input v-model.number="currentTemplate.page.bottomMarginPt" type="number" class="form-input-sm" :disabled="currentTemplate.isBuiltIn" />
              </div>
              <div class="field-item">
                <span class="sub-label">左边距 (pt)</span>
                <input v-model.number="currentTemplate.page.leftMarginPt" type="number" class="form-input-sm" :disabled="currentTemplate.isBuiltIn" />
              </div>
              <div class="field-item">
                <span class="sub-label">右边距 (pt)</span>
                <input v-model.number="currentTemplate.page.rightMarginPt" type="number" class="form-input-sm" :disabled="currentTemplate.isBuiltIn" />
              </div>
            </div>
          </div>

          <!-- Main Title -->
          <div class="form-group-card">
            <div class="group-title">主标题样式</div>
            <div class="form-grid-3">
              <div class="field-item">
                <span class="sub-label">中文字体</span>
                <select v-model="currentTemplate.mainTitle.chineseFont" class="form-input-sm" :disabled="currentTemplate.isBuiltIn">
                  <option v-for="f in fontList" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div class="field-item">
                <span class="sub-label">字号</span>
                <select v-model.number="currentTemplate.mainTitle.fontSizePt" class="form-input-sm" :disabled="currentTemplate.isBuiltIn">
                  <option v-for="fs in CHINESE_FONT_SIZES" :key="fs.pt" :value="fs.pt">
                    {{ fs.label }}
                  </option>
                  <option v-if="!CHINESE_FONT_SIZES.some(f => Math.abs(f.pt - currentTemplate.mainTitle.fontSizePt) < 0.05)" :value="currentTemplate.mainTitle.fontSizePt">
                    {{ currentTemplate.mainTitle.fontSizePt }}pt
                  </option>
                </select>
              </div>
              <div class="field-item">
                <span class="sub-label">行距 (pt)</span>
                <input v-model.number="currentTemplate.mainTitle.lineSpacingPt" type="number" class="form-input-sm" :disabled="currentTemplate.isBuiltIn" />
              </div>
            </div>
          </div>

          <!-- Dynamic Unified Heading Levels Hierarchy (Levels 1 ~ N) -->
          <div class="headings-section-header">
            <div class="group-title flex-center">
              <Layers class="w-3.5 h-3.5 mr-1 text-blue-600 inline" />
              <span>多级标题层级样式 (共 {{ headingList.length }} 级)</span>
            </div>
            <span class="headings-hint">各级标题名称、编号规则与样式均可自定义或删除</span>
          </div>

          <div 
            v-for="(item, idx) in headingList" 
            :key="item.id || idx" 
            class="form-group-card heading-level-card"
            :class="`level-card-${item.level}`"
          >
            <div class="form-row-between custom-heading-top-row">
              <div class="custom-heading-header">
                <input 
                  v-model="item.name" 
                  class="custom-level-title-input" 
                  :disabled="currentTemplate.isBuiltIn"
                  placeholder="如：一级标题 (一、) 或 第一条" 
                />
              </div>
              <div class="custom-heading-actions">
                <label class="bold-toggle-label">
                  <input type="checkbox" v-model="item.style.bold" :disabled="currentTemplate.isBuiltIn" />
                  <span>加粗</span>
                </label>
                <button 
                  v-if="!currentTemplate.isBuiltIn && headingList.length > 1" 
                  class="btn-del-level" 
                  @click="handleRemoveHeadingLevel(idx)"
                  :title="`删除第 ${item.level} 级标题`"
                >
                  <Trash2 class="w-3 h-3 inline mr-0.5" />
                  <span>删除</span>
                </button>
              </div>
            </div>

            <!-- Numbering Rule / Pattern Selector -->
            <div class="pattern-selector-row">
              <span class="sub-label-compact">编号规则:</span>
              <select 
                v-model="item.patternPreset" 
                class="form-input-sm pattern-select" 
                :disabled="currentTemplate.isBuiltIn"
                @change="onHeadingPresetChange(item)"
              >
                <option v-for="p in PATTERN_PRESETS" :key="p.value" :value="p.value">
                  {{ p.label }}
                </option>
              </select>
              <input 
                v-if="item.patternPreset === 'custom'" 
                v-model="item.customPattern" 
                type="text" 
                class="form-input-sm custom-pattern-input code-font" 
                placeholder="输入正则，如：^第[一二三四五六七八九十百]+条"
                :disabled="currentTemplate.isBuiltIn"
              />
            </div>

            <!-- Formatting Grid -->
            <div class="form-grid-3">
              <div class="field-item">
                <span class="sub-label">中文字体</span>
                <select v-model="item.style.chineseFont" class="form-input-sm" :disabled="currentTemplate.isBuiltIn">
                  <option v-for="f in fontList" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div class="field-item">
                <span class="sub-label">字号</span>
                <select v-model.number="item.style.fontSizePt" class="form-input-sm" :disabled="currentTemplate.isBuiltIn">
                  <option v-for="fs in CHINESE_FONT_SIZES" :key="fs.pt" :value="fs.pt">
                    {{ fs.label }}
                  </option>
                  <option v-if="!CHINESE_FONT_SIZES.some(f => Math.abs(f.pt - item.style.fontSizePt) < 0.05)" :value="item.style.fontSizePt">
                    {{ item.style.fontSizePt }}pt
                  </option>
                </select>
              </div>
              <div class="field-item">
                <span class="sub-label">对齐方式</span>
                <select v-model="item.style.alignment" class="form-input-sm" :disabled="currentTemplate.isBuiltIn">
                  <option value="left">居左</option>
                  <option value="center">居中</option>
                  <option value="right">居右</option>
                  <option value="justify">两端对齐</option>
                </select>
              </div>
              <div class="field-item">
                <span class="sub-label">首行缩进 (字)</span>
                <input v-model.number="item.style.firstLineIndentChars" type="number" class="form-input-sm" :disabled="currentTemplate.isBuiltIn" />
              </div>
            </div>
          </div>

          <!-- Add Heading Level Button -->
          <div v-if="!currentTemplate.isBuiltIn" class="add-level-wrapper">
            <button 
              class="btn-add-level" 
              @click="handleAddHeadingLevel"
            >
              <Plus class="w-4 h-4 mr-1 inline" />
              <span>+ 增加标题等级 (第 {{ headingList.length + 1 }} 级)</span>
            </button>
          </div>

          <!-- Body -->
          <div class="form-group-card">
            <div class="group-title">正文样式</div>
            <div class="form-grid-3">
              <div class="field-item">
                <span class="sub-label">中文字体</span>
                <select v-model="currentTemplate.body.chineseFont" class="form-input-sm" :disabled="currentTemplate.isBuiltIn">
                  <option v-for="f in fontList" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div class="field-item">
                <span class="sub-label">字号</span>
                <select v-model.number="currentTemplate.body.fontSizePt" class="form-input-sm" :disabled="currentTemplate.isBuiltIn">
                  <option v-for="fs in CHINESE_FONT_SIZES" :key="fs.pt" :value="fs.pt">
                    {{ fs.label }}
                  </option>
                  <option v-if="!CHINESE_FONT_SIZES.some(f => Math.abs(f.pt - currentTemplate.body.fontSizePt) < 0.05)" :value="currentTemplate.body.fontSizePt">
                    {{ currentTemplate.body.fontSizePt }}pt
                  </option>
                </select>
              </div>
              <div class="field-item">
                <span class="sub-label">行距 (pt)</span>
                <input v-model.number="currentTemplate.body.lineSpacingPt" type="number" class="form-input-sm" :disabled="currentTemplate.isBuiltIn" />
              </div>
            </div>
          </div>

          <!-- Custom Regex Recognition Rules (V2.3) -->
          <div class="form-group-card custom-rules-card">
            <div class="form-row-between">
              <div class="group-title flex-center">
                <Code2 class="w-3.5 h-3.5 mr-1 text-indigo-600 inline" />
                <span>自定义识别正则规则 ({{ currentTemplate.customRecognitionRules?.length || 0 }})</span>
              </div>
              <button 
                class="btn-add-rule-compact" 
                :disabled="currentTemplate.isBuiltIn"
                @click="handleAddCustomRule"
                title="添加自定义识别规则"
              >
                <Plus class="w-3 h-3 mr-0.5 inline" /> 添加规则
              </button>
            </div>

            <div class="rules-tip">
              匹配特定机构编号（如条款、案例、非标准序号），识别时将优先按此规则指派排版角色。
            </div>

            <!-- Quick Presets -->
            <div v-if="!currentTemplate.isBuiltIn" class="presets-row">
              <span class="presets-label">快捷预设:</span>
              <button class="preset-chip" @click="applyRulePreset('clause')">+ 【第X条】</button>
              <button class="preset-chip" @click="applyRulePreset('chapter')">+ 第X章</button>
              <button class="preset-chip" @click="applyRulePreset('case')">+ Case X:</button>
              <button class="preset-chip" @click="applyRulePreset('num4')">+ 1.1.1.1</button>
            </div>

            <!-- Rules List -->
            <div v-if="currentTemplate.customRecognitionRules && currentTemplate.customRecognitionRules.length > 0" class="custom-rules-list">
              <div 
                v-for="(rule, rIdx) in currentTemplate.customRecognitionRules" 
                :key="rule.id"
                class="custom-rule-item"
              >
                <div class="rule-top-row">
                  <input 
                    v-model="rule.name" 
                    type="text" 
                    class="rule-name-input"
                    placeholder="规则名称"
                    :disabled="currentTemplate.isBuiltIn"
                  />
                  <div class="rule-actions-top">
                    <label class="rule-switch-label" title="启用/禁用此规则">
                      <input type="checkbox" v-model="rule.enabled" :disabled="currentTemplate.isBuiltIn" />
                      <span>{{ rule.enabled ? '启用' : '禁用' }}</span>
                    </label>
                    <button 
                      v-if="!currentTemplate.isBuiltIn" 
                      class="btn-del-rule" 
                      @click="handleRemoveCustomRule(rIdx)"
                      title="删除规则"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div class="rule-fields-grid">
                  <div class="field-item">
                    <span class="sub-label">正则表达式</span>
                    <input 
                      v-model="rule.pattern" 
                      type="text" 
                      class="form-input-sm code-font" 
                      placeholder="^【第[一二三四五六七八九十百]+条】"
                      :disabled="currentTemplate.isBuiltIn"
                    />
                  </div>
                  <div class="field-item">
                    <span class="sub-label">指派排版角色</span>
                    <select v-model="rule.role" class="form-input-sm" :disabled="currentTemplate.isBuiltIn">
                      <option v-for="opt in customRuleRoles" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-rules-box">
              暂无自定义规则，可点击上方「快捷预设」或「添加规则」进行配置
            </div>

            <!-- Live Regex Tester -->
            <div class="regex-tester-box">
              <div class="tester-header">
                <span class="tester-title">
                  <TestTube class="w-3 h-3 mr-1 inline text-indigo-600" />
                  规则实时测试器
                </span>
                <span v-if="testResult" class="test-badge" :class="testResult.matched ? 'badge-matched' : 'badge-unmatched'">
                  {{ testResult.matched ? `命中: ${testResult.ruleName} -> ${testResult.role}` : '未匹配任何自定义规则' }}
                </span>
              </div>
              <input 
                v-model="testInputText" 
                type="text" 
                class="form-input-sm" 
                placeholder="输入一段样例文本（如：【第一条】 准入标准），即时检验匹配结果..."
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button class="btn-cancel" @click="emit('close')">取消</button>
        <button v-if="!currentTemplate.isBuiltIn" class="btn-save" @click="handleSave">
          <Save class="w-3.5 h-3.5 mr-1 inline" /> 保存修改
        </button>
        <button v-else class="btn-clone-main" @click="handleClone">
          <Copy class="w-3.5 h-3.5 mr-1 inline" /> 复制为自定义并编辑
        </button>
      </div>
    </div>

    <!-- JSON Modal -->
    <div v-if="jsonModalOpen" class="modal-backdrop sub-modal" @click.self="jsonModalOpen = false">
      <div class="sub-dialog">
        <h4>模板 JSON 配置</h4>
        <textarea v-model="jsonContent" class="json-textarea" rows="12"></textarea>
        <div class="modal-footer">
          <button class="btn-cancel" @click="jsonModalOpen = false">关闭</button>
          <button class="btn-save" @click="handleImportJson">导入为新模板</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: stretch;
  justify-content: center;
  z-index: 999;
}

.modal-dialog {
  width: 100%;
  height: 100%;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 10px 12px;
  background: #ffffff;
  border-bottom: 1px solid var(--wps-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--wps-text-main);
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--wps-text-muted);
  cursor: pointer;
  padding: 4px;
}

.btn-close:hover {
  color: var(--wps-text-main);
}

.save-toast {
  background: #ecfdf5;
  border-bottom: 1px solid #a7f3d0;
  color: #065f46;
  font-size: 11px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tpl-selector-card {
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--wps-text-muted);
}

.selector-row {
  display: flex;
}

.tpl-select-main {
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--wps-text-main);
  outline: none;
}

.tpl-action-buttons {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.btn-action-pill {
  flex: 1;
  min-width: 70px;
  padding: 4px 6px;
  border: 1px solid var(--wps-border);
  background: #f8fafc;
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--wps-text-main);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.btn-action-pill:hover {
  background: #e2e8f0;
}

.btn-create-pill {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
  font-weight: 600;
}

.btn-create-pill:hover {
  background: #dbeafe;
  border-color: #3b82f6;
}

.btn-clone-pill {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #6d28d9;
}

.btn-clone-pill:hover {
  background: #ede9fe;
}

.btn-del-pill {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.btn-del-pill:hover {
  background: #fee2e2;
}

.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group-card {
  background: #ffffff;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-heading-card {
  border-left: 3px solid #3b82f6;
  background: #fcfdfe;
}

.form-row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.custom-heading-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.custom-heading-header {
  flex: 1;
  min-width: 0;
}

.custom-heading-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.custom-level-title-input {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--wps-text-main);
  border: 1px dashed #cbd5e1;
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  width: 100%;
  max-width: 140px;
  background: #ffffff;
  box-sizing: border-box;
}

.custom-level-title-input:disabled {
  border: none;
  background: transparent;
  padding: 0;
}

.btn-del-level {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 10.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.btn-del-level:hover {
  background: #fecaca;
}

.add-level-wrapper {
  margin: 4px 0;
}

.btn-add-level {
  width: 100%;
  padding: 8px;
  border: 1.5px dashed #93c5fd;
  background: #eff6ff;
  border-radius: var(--radius-md);
  color: #1d4ed8;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-add-level:hover {
  background: #dbeafe;
  border-color: #3b82f6;
}

.bold-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  color: var(--wps-text-muted);
  cursor: pointer;
}

.group-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--wps-text-main);
}

.tag-builtin-tip {
  font-size: 10px;
  color: #d97706;
}

.tag-custom-badge {
  font-size: 10px;
  background: #dcfce7;
  color: #15803d;
  padding: 1px 4px;
  border-radius: 2px;
}

.form-input {
  width: 100%;
  padding: 5px 8px;
  font-size: 11.5px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
}

.form-input:disabled {
  background: #f8fafc;
  color: #64748b;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 5px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sub-label {
  font-size: 10px;
  color: var(--wps-text-muted);
}

.form-input-sm {
  width: 100%;
  padding: 4px 5px;
  font-size: 11px;
  border: 1px solid var(--wps-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
}

.form-input-sm:disabled {
  background: #f8fafc;
  color: #64748b;
}

.modal-footer {
  padding: 8px 12px;
  background: #ffffff;
  border-top: 1px solid var(--wps-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.btn-cancel {
  padding: 5px 12px;
  border: 1px solid var(--wps-border);
  background: #ffffff;
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
}

.btn-save {
  padding: 5px 14px;
  border: none;
  background: var(--wps-primary);
  color: #ffffff;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-clone-main {
  padding: 5px 14px;
  border: none;
  background: #4f46e5;
  color: #ffffff;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.sub-modal .sub-dialog {
  background: #ffffff;
  border-radius: var(--radius-lg);
  padding: 12px;
  width: 90%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: auto;
}

.custom-rules-card {
  border-left: 3px solid #6366f1;
  background: #faf5ff;
}

.btn-add-rule-compact {
  padding: 2px 8px;
  font-size: 11px;
  background: #ede9fe;
  color: #4338ca;
  border: 1px solid #c7d2fe;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.12s ease;
}

.btn-add-rule-compact:hover:not(:disabled) {
  background: #e0e7ff;
  color: #3730a3;
}

.rules-tip {
  font-size: 10.5px;
  color: #6b7280;
  line-height: 1.35;
}

.presets-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0;
}

.presets-label {
  font-size: 10.5px;
  color: #6366f1;
  font-weight: 500;
}

.preset-chip {
  padding: 1px 6px;
  font-size: 10px;
  background: #ffffff;
  border: 1px solid #c7d2fe;
  color: #4f46e5;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
}

.preset-chip:hover {
  background: #e0e7ff;
}

.custom-rules-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.custom-rule-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rule-name-input {
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
  border: 1px solid transparent;
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  background: transparent;
  width: 140px;
}

.rule-name-input:focus {
  border-color: #cbd5e1;
  background: #ffffff;
}

.rule-actions-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rule-switch-label {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #64748b;
  cursor: pointer;
}

.btn-del-rule {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
}

.btn-del-rule:hover {
  color: #ef4444;
}

.rule-fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.code-font {
  font-family: Consolas, monospace;
}

.empty-rules-box {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: var(--radius-sm);
  padding: 10px;
  text-align: center;
  font-size: 10.5px;
  color: #94a3b8;
}

.regex-tester-box {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tester-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tester-title {
  font-size: 11px;
  font-weight: 600;
  color: #4338ca;
}

.test-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.badge-matched {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.badge-unmatched {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.headings-section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 2px 2px;
  border-bottom: 1px solid var(--wps-border);
  margin-top: 4px;
}

.headings-hint {
  font-size: 10px;
  color: var(--wps-text-muted);
}

.heading-level-card {
  border-left: 3px solid #3b82f6;
  background: #ffffff;
}

.level-card-1 {
  border-left-color: #1d4ed8;
}

.level-card-2 {
  border-left-color: #2563eb;
}

.level-card-3 {
  border-left-color: #3b82f6;
}

.level-card-4 {
  border-left-color: #60a5fa;
}

.pattern-selector-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  border: 1px dashed #e2e8f0;
}

.sub-label-compact {
  font-size: 10px;
  color: #64748b;
  font-weight: 500;
  flex-shrink: 0;
}

.pattern-select {
  flex: 1;
  font-size: 11px;
}

.custom-pattern-input {
  flex: 1.2;
}
</style>
