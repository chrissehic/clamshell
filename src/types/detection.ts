export interface RepositoryDetails {
  full_name: string
  html_url: string
  similarity_score?: number
  detection_type: 'url_mention' | 'html_content'
  reference_location?: 'repo_metadata' | 'code_file'
  match_context?: string
  file_links: string[]
  stargazers_count: number
  forks_count: number
  language: string
  code_match?: {
    path: string
    html_url: string
  }
}

export interface AIModelDetection {
  modelName: string
  contentType: "url" | "html" | "css" | "javascript" | "text" | "images" | "code"
  confidenceLevel: number
  source: string
  lastDetected: string
  data?: {
    repositories?: RepositoryDetails[]
  }
}

export interface CopycatWebsite {
  url: string
  similarityScore: number
  copiedFeatures: string[]
  detectionMethod: string
  screenshot?: string
}

export interface DetectionResult {
  aiModels: AIModelDetection[]
  copycatSites: CopycatWebsite[]
  analysisComplete: boolean
  lastAnalyzed: string
}

export interface DetectionRequest {
  url: string
  title?: string
  description?: string
  source?: string
  index?: string
}

export interface SourceConfig {
  id: string
  name: string
  description: string
  type: "dataset" | "archive" | "search" | "social"
  category: "crawlers" | "code" | "social"
  contentType: "url" | "html" | "css" | "javascript" | "text" | "images" | "code"
  hasSubOptions: boolean
  subOptions?: { [key: string]: string }
}
