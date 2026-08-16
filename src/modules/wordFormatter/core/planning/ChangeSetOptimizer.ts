import type { FormatPlan, FormatChange, FormatProperty } from '../../types/planning'

export class ChangeSetOptimizer {
  /**
   * Group enabled paragraph changes by paragraph index
   */
  static groupChangesByParagraph(changes: FormatChange[]): Map<number, FormatChange[]> {
    const map = new Map<number, FormatChange[]>()
    changes.forEach(c => {
      if (c.enabled && c.targetType === 'paragraph' && c.targetIndex !== undefined) {
        if (!map.has(c.targetIndex)) {
          map.set(c.targetIndex, [])
        }
        map.get(c.targetIndex)!.push(c)
      }
    })
    return map
  }

  /**
   * Group enabled section changes by section index
   */
  static groupChangesBySection(changes: FormatChange[]): Map<number, FormatChange[]> {
    const map = new Map<number, FormatChange[]>()
    changes.forEach(c => {
      if (c.enabled && c.targetType === 'section' && c.targetIndex !== undefined) {
        if (!map.has(c.targetIndex)) {
          map.set(c.targetIndex, [])
        }
        map.get(c.targetIndex)!.push(c)
      }
    })
    return map
  }

  /**
   * Group enabled table changes by table index
   */
  static groupChangesByTable(changes: FormatChange[]): Map<number, FormatChange[]> {
    const map = new Map<number, FormatChange[]>()
    changes.forEach(c => {
      if (c.enabled && c.targetType === 'table' && c.targetIndex !== undefined) {
        if (!map.has(c.targetIndex)) {
          map.set(c.targetIndex, [])
        }
        map.get(c.targetIndex)!.push(c)
      }
    })
    return map
  }

  /**
   * Enable/Disable all changes of a specific category
   */
  static setCategoryEnabled(plan: FormatPlan, category: FormatChange['category'], enabled: boolean): void {
    plan.changes.forEach(c => {
      if (c.category === category) {
        c.enabled = enabled
      }
    })
    this.recalculateSummary(plan)
  }

  /**
   * Enable/Disable all changes of a specific property
   */
  static setPropertyEnabled(plan: FormatPlan, property: FormatProperty, enabled: boolean): void {
    plan.changes.forEach(c => {
      if (c.property === property) {
        c.enabled = enabled
      }
    })
    this.recalculateSummary(plan)
  }

  /**
   * Toggle a single change by ID
   */
  static setChangeEnabled(plan: FormatPlan, changeId: string, enabled: boolean): void {
    const target = plan.changes.find(c => c.id === changeId)
    if (target) {
      target.enabled = enabled
      this.recalculateSummary(plan)
    }
  }

  /**
   * Recalculate summary metrics
   */
  static recalculateSummary(plan: FormatPlan): void {
    plan.summary.enabledChanges = plan.changes.filter(c => c.enabled).length
  }
}
