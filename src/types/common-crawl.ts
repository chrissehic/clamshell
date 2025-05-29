export interface CommonCrawlRecord {
  urlkey: string
  timestamp: string
  url: string
  mime: string
  "mime-detected": string
  status: string
  digest: string
  length: string
  offset: string
  filename: string
  languages?: string
  encoding?: string
  redirect?: string
}
