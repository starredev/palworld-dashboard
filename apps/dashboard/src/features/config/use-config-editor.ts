import { computed, ref } from 'vue'
import { DEFAULT_OPTION_SETTINGS } from './default-ini'
import { parseBody, parseConfig, toBody, toIni } from './serialize'
import { PRESETS } from './presets'

/** Reactive state for the config editor: a raw key→value map + original order. */
export function useConfigEditor() {
  const base = parseBody(DEFAULT_OPTION_SETTINGS)
  const order = ref<string[]>([...base.order])
  const values = ref<Record<string, string>>({ ...base.values })
  const activePreset = ref('defaults')

  function applyPreset(id: string): void {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    activePreset.value = id
    order.value = [...base.order]
    values.value = { ...base.values, ...preset.overrides }
  }

  /** Import pasted ini text. Returns false if nothing parseable was found. */
  function importText(text: string): boolean {
    const parsed = parseConfig(text)
    if (!parsed || parsed.order.length === 0) return false
    order.value = parsed.order
    values.value = parsed.values
    activePreset.value = ''
    return true
  }

  function set(key: string, raw: string): void {
    if (!(key in values.value)) order.value = [...order.value, key]
    values.value = { ...values.value, [key]: raw }
    activePreset.value = ''
  }

  const ini = computed(() => toIni({ order: order.value, values: values.value }))
  const body = computed(() => toBody({ order: order.value, values: values.value }))
  const changedCount = computed(
    () => order.value.filter((k) => values.value[k] !== base.values[k]).length,
  )

  return { values, activePreset, applyPreset, importText, set, ini, body, changedCount }
}
