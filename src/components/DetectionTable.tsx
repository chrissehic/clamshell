"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, Globe } from "lucide-react"
import type { RepositoryDetails, SourceConfig, DetectionResult } from "@/types/detection"
import { GithubReposTable } from "@/components/detection/GithubReposTable"
import { CrawlersTable } from "@/components/detection/CrawlersTable"

// Define SourceResult type locally
interface SourceResult {
  source: string
  loading: boolean
  result: DetectionResult | null
  error: string | null
  selectedYear: string
}

interface DetectionAnalysisProps {
  url: string
  title?: string
  description?: string
}

// Using the SourceResult type from detection-sources.ts

interface DetectionRequestBody {
  url: string
  source: string
  title?: string
  description?: string
  year?: string
}

export default function DetectionAnalysis({ url, title, description }: DetectionAnalysisProps) {
  const [availableSources, setAvailableSources] = useState<{ [key: string]: SourceConfig }>({})
  const [sourceResults, setSourceResults] = useState<{ [key: string]: SourceResult }>({})
  const [activeTab, setActiveTab] = useState("code")
  const initialAnalysisRun = useRef(false)
  const [githubRepos, setGithubRepos] = useState<RepositoryDetails[]>([])
  const [isLoadingGithub, setIsLoadingGithub] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)

  const runAnalysisForSource = useCallback(
    async (sourceId: string, yearOverride?: string) => {
      console.log(`Running analysis for ${sourceId}`)

      const currentYear =
        yearOverride || sourceResults[sourceId]?.selectedYear || "2025"

      setSourceResults((prev) => ({
        ...prev,
        [sourceId]: {
          ...prev[sourceId],
          loading: true,
          error: null,
        },
      }))

      try {
        const requestBody: DetectionRequestBody = {
          url,
          source: sourceId,
          title,
          description,
          year: currentYear, // Ensure year is always included
        }

        console.log(`Sending request for ${sourceId}:`, requestBody)

        const response = await fetch("/api/detection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(`API failed: ${response.status}`)
        }

        const data = await response.json()
        console.log(`Received response for ${sourceId}:`, data)

        setSourceResults((prev) => ({
          ...prev,
          [sourceId]: {
            ...prev[sourceId],
            loading: false,
            result: data,
          },
        }))
      } catch (err) {
        console.error(`Analysis failed for ${sourceId}:`, err)
        setSourceResults((prev) => ({
          ...prev,
          [sourceId]: {
            ...prev[sourceId],
            loading: false,
            error: err instanceof Error ? err.message : "Analysis failed",
          },
        }))
      }
    },
    [url, title, description, sourceResults],
  )

  // Fetch GitHub repositories
  const fetchGithubRepos = useCallback(async () => {
    console.log("Fetching GitHub repositories...")
    setIsLoadingGithub(true)
    setGithubError(null)

    try {
      const requestBody = {
        url,
        source: "github-repos",
        title,
        description,
      }

      const response = await fetch("/api/detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`GitHub API failed: ${response.status}`)
      }

      const data = await response.json()
      console.log("Received GitHub repos:", data)

      // Extract repositories from the response
      const repos = data.aiModels?.[0]?.data?.repositories || []
      setGithubRepos(repos)
    } catch (err) {
      console.error("GitHub repos fetch failed:", err)
      setGithubError(err instanceof Error ? err.message : "Failed to fetch GitHub repositories")
    } finally {
      setIsLoadingGithub(false)
    }
  }, [url, title, description])

  useEffect(() => {
    // Only run this effect once when the component mounts
    const controller = new AbortController();
    
    const fetchSources = async () => {
      console.log("Fetching available sources...")
      try {
        const response = await fetch("/api/detection", {
          signal: controller.signal
        })
        if (response.ok) {
          const data = await response.json()
          console.log("Fetched sources:", data.sources)

          setAvailableSources(data.sources || {})

          // Initialize source results with default years
          const initialResults: { [key: string]: SourceResult } = {}
          Object.keys(data.sources || {}).forEach((sourceId) => {
            // Skip github-repos as it's handled separately
            if (sourceId === "github-repos") return
            
            const sourceConfig = data.sources[sourceId]
            const defaultYear =
              sourceConfig.hasSubOptions && sourceConfig.subOptions
                ? Object.keys(sourceConfig.subOptions)[0]
                : "2025" // Ensure a default fallback year

            initialResults[sourceId] = {
              source: sourceId,
              loading: false,
              result: null,
              error: null,
              selectedYear: defaultYear,
            }
          })

          setSourceResults(initialResults)

          // If we have sources and this is the first load, run analysis for the default sources
          if (Object.keys(data.sources).length > 0 && !initialAnalysisRun.current) {
            initialAnalysisRun.current = true
            
            // Run analysis for each source in the crawlers category
            const sourcesToRun = Object.keys(data.sources).filter(
              (sourceId) => 
                data.sources[sourceId].category === "crawlers" && 
                sourceId !== "github-repos"
            )

            for (const sourceId of sourcesToRun) {
              const sourceConfig = data.sources[sourceId]
              const defaultYear =
                sourceConfig.hasSubOptions && sourceConfig.subOptions
                  ? Object.keys(sourceConfig.subOptions)[0]
                  : undefined

              runAnalysisForSource(sourceId, defaultYear)
            }
            
            // Fetch GitHub repositories separately
            fetchGithubRepos()
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch sources:", error)
        }
      }
    }

    fetchSources()
    
    // Cleanup function to abort any pending requests when component unmounts
    return () => {
      controller.abort()
    }
  }, []) // Empty dependency array - only run once on mount

  const handleYearChange = useCallback(
    (sourceId: string, year: string) => {
      console.log(`Year changed for ${sourceId} to ${year}`);
      setSourceResults((prev) => ({
        ...prev,
        [sourceId]: {
          ...prev[sourceId],
          selectedYear: year,
        },
      }));

      runAnalysisForSource(sourceId, year);
    },
    [runAnalysisForSource],
  );
  
  const handleGithubRefresh = useCallback(() => {
    fetchGithubRepos();
  }, [fetchGithubRepos]);

  const handleRefresh = useCallback((sourceId: string) => {
    console.log(`Refreshing ${sourceId}`)
    runAnalysisForSource(sourceId, sourceResults[sourceId]?.selectedYear)
  }, [runAnalysisForSource, sourceResults])

  // Using the CrawlersTable component instead of rendering directly

  // Using the GithubReposTable component instead of rendering directly

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            GitHub Repositories
          </TabsTrigger>
          <TabsTrigger value="crawlers" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Web Crawlers & Archives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-4">
          <GithubReposTable 
            repos={githubRepos}
            isLoading={isLoadingGithub}
            error={githubError}
            onRefresh={handleGithubRefresh}
          />
        </TabsContent>

        <TabsContent value="crawlers" className="space-y-4">
          <CrawlersTable 
            sources={availableSources}
            sourceResults={sourceResults}
            onYearChange={handleYearChange}
            onRefresh={handleRefresh}
            categoryTitle="Web Crawlers & Archives"
            categoryDescription="Check if your website URL appears in web crawlers and archive services"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
