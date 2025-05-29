"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoaderCircle, RefreshCw, Star, GitFork } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { RepositoryDetails } from "@/types/detection"

interface GithubReposTableProps {
  repos: RepositoryDetails[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

export function GithubReposTable({ repos, isLoading, error, onRefresh }: GithubReposTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <div>
          <CardTitle>GitHub Repositories</CardTitle>
          <CardDescription>Find code repositories on GitHub that may be related to your website</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <LoaderCircle className="w-6 h-6 animate-spin mr-2" />
            <span>Loading GitHub repositories...</span>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-destructive">
            <p>Error: {error}</p>
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No related GitHub repositories found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="!text-background-accent">
                <TableHead>Repository</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repos.map((repo) => (
                <TableRow key={repo.full_name}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-accent-foreground"
                      >
                        {repo.full_name}
                      </a>
                    </div>
                  </TableCell>

                  <TableCell>
                    {repo.language ? (
                      <Badge variant="outline">{repo.language}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        <span className="text-sm">{repo.stargazers_count}</span>
                      </div>  
                      <div className="flex items-center gap-1">
                        <GitFork className="w-3 h-3" />
                        <span className="text-sm">{repo.forks_count}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {repo.detection_type === "html_content" ? (
                      <Badge variant="secondary">
                        HTML Content Match
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        URL Reference
                      </Badge>
                    )}
                    {repo.match_context && (
                      <div className="mt-1 text-xs text-gray-500 max-w-xs truncate">
                        {repo.match_context}
                      </div>
                    )}
                  </TableCell>

                
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
