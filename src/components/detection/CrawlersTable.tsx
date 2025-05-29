"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoaderCircle, RefreshCw } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { SourceConfig, DetectionResult } from "@/types/detection"

// Define SourceResult type directly in this file since we're having import issues
interface SourceResult {
  source: string
  loading: boolean
  result: DetectionResult | null
  error: string | null
  selectedYear: string
}

interface CrawlersTableProps {
  sources: { [key: string]: SourceConfig }
  sourceResults: { [key: string]: SourceResult }
  onYearChange: (sourceId: string, year: string) => void
  onRefresh: (sourceId: string) => void
  categoryTitle: string
  categoryDescription: string
}

export function CrawlersTable({
  sources,
  sourceResults,
  onYearChange,
  onRefresh,
  categoryTitle,
  categoryDescription,
}: CrawlersTableProps) {
  // Filter sources to only include crawlers category
  const sourcesInCategory = Object.keys(sources).filter(
    (sourceId) => sources[sourceId].category === "crawlers" && sourceId !== "github-repos"
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{categoryTitle}</CardTitle>
        <CardDescription>{categoryDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {sourcesInCategory.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No detection sources available</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Year/Version</TableHead>
                <TableHead>Instances</TableHead>
                <TableHead>Result</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourcesInCategory.map((sourceId) => {
                const sourceConfig = sources[sourceId]
                const result = sourceResults[sourceId]
                const detection = result?.result?.aiModels?.[0]

                return (
                  <TableRow key={sourceId}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{sourceConfig.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {sourceConfig.description}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {sourceConfig.hasSubOptions && sourceConfig.subOptions ? (
                        <Select
                          value={result?.selectedYear}
                          onValueChange={(value) => onYearChange(sourceId, value)}
                          disabled={result?.loading}
                          defaultValue={sourceConfig.subOptions[0]}
                        >
                          <SelectTrigger className="w-[120px] hover:bg-white">
                            <SelectValue placeholder="Options" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(sourceConfig.subOptions).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {typeof label === "string" && label.length > 10 ? key : label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {result?.loading ? (
                        <div className="flex items-center gap-2">
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                      ) : result?.error ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : detection ? (
                        <Badge variant="default" className="font-mono">
                          {detection.confidenceLevel}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {result?.loading ? (
                        <span className="text-sm text-muted-foreground">Checking...</span>
                      ) : result?.error ? (
                        <span className="text-sm text-destructive">{result.error}</span>
                      ) : detection ? (
                        <span className="text-sm text-muted-foreground">{detection.source}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No matches found</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRefresh(sourceId)}
                        disabled={result?.loading}
                      >
                        <RefreshCw className={`w-4 h-4 ${result?.loading ? "animate-spin" : ""}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
