import { DEFAULT_FREQUENT_PRESETS } from '../constants/categories'
import type { CategoryId, FrequentPreset, Transaction } from '../types/ledger'

interface NoteFrequencyBucket {
  category: CategoryId
  count: number
  latestMs: number
  latestLabel: string
  latestAmount: number
  latestIsImpulse: boolean
}

/**
 * Computes up to `maxCount` quick-fill presets ordered as:
 * 1) user-pinned `customPresets`, 2) expenses logged 2+ times (frequency then recency),
 * and 3) `DEFAULT_FREQUENT_PRESETS`, deduplicated by lowercase label.
 */
export function getSmartFrequentPresets(
  transactions: Transaction[],
  customPresets: FrequentPreset[] = [],
  maxCount = 6,
): FrequentPreset[] {
  if (maxCount <= 0) {
    return []
  }

  const result: FrequentPreset[] = []
  const seenLabels = new Set<string>()

  for (const preset of customPresets) {
    if (result.length >= maxCount) {
      break
    }
    const label = preset.label.trim()
    const key = label.toLowerCase()
    if (!label || seenLabels.has(key)) {
      continue
    }
    seenLabels.add(key)
    result.push({ ...preset, label })
  }

  if (result.length >= maxCount) {
    return result
  }

  const buckets = new Map<string, NoteFrequencyBucket>()

  for (const tx of transactions) {
    const trimmedNote = tx.note.trim()
    if (!trimmedNote) {
      continue
    }

    const normalizedNote = trimmedNote.toLowerCase()
    const key = `${normalizedNote}::${tx.category}`
    const parsedMs = Date.parse(tx.timestamp)
    const txMs = Number.isNaN(parsedMs) ? 0 : parsedMs

    const existing = buckets.get(key)
    if (!existing) {
      buckets.set(key, {
        category: tx.category,
        count: 1,
        latestMs: txMs,
        latestLabel: trimmedNote,
        latestAmount: tx.amount,
        latestIsImpulse: tx.isImpulse,
      })
    } else {
      existing.count += 1
      if (txMs >= existing.latestMs) {
        existing.latestMs = txMs
        existing.latestLabel = trimmedNote
        existing.latestAmount = tx.amount
        existing.latestIsImpulse = tx.isImpulse
      }
    }
  }

  const promoted = Array.from(buckets.values())
    .filter((bucket) => bucket.count >= 2)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count
      }
      return b.latestMs - a.latestMs
    })

  for (let i = 0; i < promoted.length && result.length < maxCount; i += 1) {
    const bucket = promoted[i]
    const key = bucket.latestLabel.toLowerCase()
    if (seenLabels.has(key)) {
      continue
    }
    seenLabels.add(key)
    result.push({
      id: `smart-${bucket.category}-${i}`,
      label: bucket.latestLabel,
      category: bucket.category,
      defaultAmount: bucket.latestAmount,
      isImpulse: bucket.latestIsImpulse,
    })
  }

  for (const preset of DEFAULT_FREQUENT_PRESETS) {
    if (result.length >= maxCount) {
      break
    }
    const key = preset.label.toLowerCase()
    if (seenLabels.has(key)) {
      continue
    }
    seenLabels.add(key)
    result.push(preset)
  }

  return result
}
