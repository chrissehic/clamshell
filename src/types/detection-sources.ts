import type { DetectionResult, SourceConfig as BaseSourceConfig } from "@/types/detection"

export interface SourceResult {
  source: string
  loading: boolean
  result: DetectionResult | null
  error: string | null
  selectedYear: string
}

// Re-export the SourceConfig type from detection.ts
export type { BaseSourceConfig as SourceConfig }
