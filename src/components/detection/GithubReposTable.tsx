"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, RefreshCw, Star, GitFork, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RepositoryDetails } from "@/types/detection";

interface GithubReposTableProps {
  repos: RepositoryDetails[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function GithubReposTable({
  repos,
  isLoading,
  error,
  onRefresh,
}: GithubReposTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  
  // Calculate pagination
  const totalPages = Math.ceil(repos.length / pageSize);
  const paginatedRepos = repos.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10);
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <div>
          <CardTitle>GitHub Repositories</CardTitle>
          <CardDescription>
            Find code repositories on GitHub that may be related to your website
          </CardDescription>
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
            <p className="text-muted-foreground">
              No related GitHub repositories found
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Stats</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRepos.map((repo) => (
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
                    <div className="flex flex-row gap-1 items-center">
                      {repo.detection_type === "html_content" ? (
                        <Badge variant="secondary">HTML Content Match</Badge>
                      ) : (
                        <Badge variant="secondary">URL Reference</Badge>
                      )}
                      {(repo.reference_location === "code_file" && repo.code_match) && (
                        <a href={`${repo.code_match.html_url}`} target="_blank" rel="noopener noreferrer">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Found in Code
                            <ExternalLink className="size-4" />
                          </Badge>
                        </a>
                      )}
                      {repo.reference_location === "repo_metadata" && (
                        <Badge variant="outline" className="text-muted-foreground">Found in Metadata</Badge>
                      )}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {/* Pagination Controls */}
        {repos.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, repos.length)}-{
                  Math.min(page * pageSize, repos.length)
                } of {repos.length} repositories
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent>
                    {[12, 24, 50, 100].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center text-sm w-8">
                  {page}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
