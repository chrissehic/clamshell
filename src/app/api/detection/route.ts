import { type NextRequest, NextResponse } from "next/server"
import type { DetectionRequest, DetectionResult, AIModelDetection, SourceConfig, RepositoryDetails } from "@/types/detection"
import type { CommonCrawlRecord } from "@/types/common-crawl"

// Available sources organized by category
// Available sources organized by category
const DETECTION_SOURCES: { [key: string]: SourceConfig } = {
  "common-crawl": {
    id: "common-crawl",
    name: "Common Crawl",
    description: "Searches historical web archives for model training data",
    type: "dataset",
    category: "crawlers",
    contentType: "url",
    hasSubOptions: true,
    subOptions: {
      "2025": "CC-MAIN-2025-18",
      "2024":
        "CC-MAIN-2024-51,CC-MAIN-2024-46,CC-MAIN-2024-42,CC-MAIN-2024-38,CC-MAIN-2024-33,CC-MAIN-2024-26,CC-MAIN-2024-22,CC-MAIN-2024-18,CC-MAIN-2024-10",
    },
  },
  "wayback-machine": {
    id: "wayback-machine",
    name: "Internet Archive",
    description: "Historical snapshots of websites",
    type: "archive",
    category: "crawlers",
    contentType: "url",
    hasSubOptions: false,
  },
  "github-repos": {
    id: "github-repos",
    name: "Github Repos",
    description: "Code Repositories from Github",
    type: "archive",
    category: "code",
    contentType: "code",
    hasSubOptions: false,
  },
}

// Common Crawl index URLs
const CC_INDEX_URLS: { [key: string]: string } = {
  "CC-MAIN-2025-18": "https://index.commoncrawl.org/CC-MAIN-2025-18-index",
  "CC-MAIN-2024-51": "https://index.commoncrawl.org/CC-MAIN-2024-51-index",
  "CC-MAIN-2024-46": "https://index.commoncrawl.org/CC-MAIN-2024-46-index",
  "CC-MAIN-2024-42": "https://index.commoncrawl.org/CC-MAIN-2024-42-index",
  "CC-MAIN-2024-26": "https://index.commoncrawl.org/CC-MAIN-2024-26-index",
}

const USE_COMMON_CRAWL_API = false; // toggle this to true/false
const USE_WAYBACK_MACHINE_API = false; // toggle this to true/false
const USE_GITHUB_API = false; // toggle this to true/false

const userAgent = "PearlTracker/1.0";

/**
 * Pauses execution for a specified amount of time.
 * @param ms - The time to sleep in milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Query a single Common Crawl index with better error handling
async function queryCommonCrawlIndex(url: string, index: string, retries = 3): Promise<number> {
  const indexUrl = CC_INDEX_URLS[index];
  if (!indexUrl) return 0;

  const apiUrl = `${indexUrl}?url=${encodeURIComponent(url)}&output=json`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        headers: { "User-Agent": userAgent },
      });

      if (response.ok) {
        const responseText = await response.text();
        if (!responseText.trim()) return 0;

        const lines = responseText.trim().split("\n");
        let recordCount = 0;

        for (const line of lines) {
          try {
            JSON.parse(line) as CommonCrawlRecord; // Validate the JSON
            recordCount++;
          } catch { }
        }

        return recordCount;
      } else if (response.status === 503) {
        console.warn(`Index ${index} API returned 503. Retrying...`);
      } else {
        console.warn(`Unexpected status ${response.status} for index ${index}`);
        break; // Exit retry loop for non-retryable errors
      }
    } catch (error) {
      console.error(`Error querying index ${index}:`, error);
    }

    await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
  }

  return 0;
}

// Common Crawl detection for a specific year
async function detectCommonCrawlByYear(url: string, year: string): Promise<AIModelDetection[]> {
  try {
    const yearIndexes = DETECTION_SOURCES["common-crawl"].subOptions?.[year];
    if (!yearIndexes) {
      console.log(`No indexes found for year: ${year}`);
      return [];
    }

    const indexes = yearIndexes.split(",");
    console.log(`Checking ${indexes.length} indexes for year ${year}`);

    const results = await Promise.all(
      indexes.map(async (index) => {
        await sleep(500); // Rate-limiting
        return {
          index,
          recordCount: await queryCommonCrawlIndex(url, index),
        };
      })
    );

    const totalRecords = results.reduce((sum, { recordCount }) => sum + recordCount, 0);
    const indexResults = results
      .filter(({ recordCount }) => recordCount > 0)
      .map(({ index, recordCount }) => `${index}: ${recordCount}`);

    console.log(`Total records found for ${year}: ${totalRecords}`);

    if (totalRecords > 0) {
      return [
        {
          modelName: `Common Crawl ${year}`,
          contentType: "url",
          confidenceLevel: totalRecords,
          source: `${totalRecords} instances across ${indexResults.length} indexes`,
          lastDetected: new Date().toISOString(),
        },
      ];
    }

    return [];
  } catch (error) {
    console.error(`Error querying Common Crawl ${year}:`, error);
    return [];
  }
}

// Wayback Machine detection
async function detectWaybackMachine(url: string): Promise<AIModelDetection[]> {
  try {
    const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=1000`
    console.log(`Querying Wayback Machine: ${apiUrl}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "PearlTracker/1.0" },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`Wayback Machine API failed: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()
    const snapshotCount = Array.isArray(data) ? Math.max(0, data.length - 1) : 0

    console.log(`Found ${snapshotCount} snapshots in Wayback Machine`)

    if (snapshotCount > 0) {
      return [
        {
          modelName: "Internet Archive",
          contentType: "url",
          confidenceLevel: snapshotCount,
          source: `${snapshotCount} archived snapshots`,
          lastDetected: new Date().toISOString(),
        },
      ]
    }

    return []
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Wayback Machine API timeout")
      return [
        {
          modelName: "Internet Archive",
          contentType: "url",
          confidenceLevel: 0,
          source: "API timeout - try again later",
          lastDetected: new Date().toISOString(),
        },
      ]
    }
    console.error("Error querying Wayback Machine:", error)
    return []
  }
}

// GitHub Repositories detection
interface GithubRepo {
  full_name: string;
  html_url: string;
  url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  similarity_score?: number;
  detection_type?: string;
  reference_location?: 'repo_metadata' | 'code_file';
  match_context?: string;
  code_match?: {
    path: string;
    html_url: string;
  };
}

interface GithubCodeSearchItem {
  repository: {
    full_name: string;
    html_url: string;
    url: string;
  };
  path: string;
  html_url: string;
}

interface GithubFile {
  type: string;
  size: number;
  html_url: string;
}

// Helper function to fetch all pages from GitHub API
async function fetchAllPages<T>(url: string, token: string, perPage = 100): Promise<T[]> {
  let page = 1;
  let allItems: T[] = [];
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PearlTracker/1.0',
        'Authorization': `token ${token}`,
      }
    });

    if (!response.ok) {
      console.warn(`GitHub API returned status ${response.status} for page ${page}`);
      break;
    }

    const data = await response.json();
    const items = data.items || [];
    
    allItems = [...allItems, ...items];
    
    // Check if we've reached the last page
    if (items.length < perPage) {
      hasMore = false;
    } else {
      page++;
      // Be nice to GitHub's API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allItems;
}

function generateUrlVariations(url: string): string[] {
  try {
    // Normalize the URL to ensure consistency
    const normalizedUrl = url.trim().toLowerCase();

    // Parse the URL into components
    const urlObject = new URL(normalizedUrl);

    // Extract components
    const hostname = urlObject.hostname.replace(/^www\./, '');
    const pathname = urlObject.pathname;

    // Generate variations
    const variations = new Set<string>();

    // Original URL
    variations.add(url);

    // Without protocol
    variations.add(`${hostname}${pathname}`);

    // Without protocol and path
    variations.add(hostname);

    // // Without TLD
    // const withoutTld = hostname.replace(/\.[^.]+$/, '');
    // variations.add(withoutTld);

    // Return variations as an array
    return Array.from(variations);
  } catch (error) {
    console.error('Error generating URL variations:', error);
    return [url];
  }
}


async function searchGithubWithVariation(variation: string, isCodeSearch: boolean, token: string): Promise<GithubRepo[] | GithubCodeSearchItem[]> {
  const encodedVariation = encodeURIComponent(`"${variation}"`);
  const apiUrl = isCodeSearch 
    ? `https://api.github.com/search/code?q=${encodedVariation}`
    : `https://api.github.com/search/repositories?q=${encodedVariation}`;
    
  try {
    return await fetchAllPages(
      apiUrl,
      token,
      100
    ) as GithubRepo[] | GithubCodeSearchItem[];
  } catch (error) {
    console.error(`Error searching GitHub for variation "${variation}":`, error);
    return [];
  }
}

async function detectGithubRepos(url: string): Promise<AIModelDetection[]> {
  try {
    if (!process.env.GITHUB_TOKEN) {
      console.error('GitHub token not found in environment variables');
      return [];
    }

    const token = process.env.GITHUB_TOKEN;
    const urlVariations = generateUrlVariations(url);
    console.log('Searching for URL variations:', urlVariations);
    
    // Search for all variations in parallel
    const searchPromises = [];
    
    // Search for repositories with each variation
    for (const variation of urlVariations) {
      searchPromises.push(searchGithubWithVariation(variation, false, token));
    }
    
    // Search for code with each variation
    for (const variation of urlVariations) {
      searchPromises.push(searchGithubWithVariation(variation, true, token));
    }
    
    // Wait for all searches to complete
    const allResults = await Promise.all(searchPromises);
    
    // Split results back into repo and code searches
    const midPoint = urlVariations.length;
    const allRepoItems = allResults.slice(0, midPoint).flat() as GithubRepo[];
    const allCodeItems = allResults.slice(midPoint).flat() as GithubCodeSearchItem[];
    
    // Process all repository and code search results
    const repoItems = allRepoItems;
    const codeItems = allCodeItems;

    console.log(`Found ${repoItems.length} repository matches`);
    console.log(`Found ${codeItems.length} code references to the URL`);
    
    // Process code search results FIRST to prioritize them
    const uniqueCodeRepos = new Map<string, GithubRepo>();
    
    if (codeItems.length > 0) {
      codeItems.forEach((item: GithubCodeSearchItem) => {
        if (item.repository && !uniqueCodeRepos.has(item.repository.full_name)) {
          const codeRepo: GithubRepo = {
            full_name: item.repository.full_name,
            html_url: item.repository.html_url,
            url: item.repository.url,
            stargazers_count: 0,
            forks_count: 0,
            language: '',
            detection_type: 'url_mention',
            reference_location: 'code_file', // Mark as code file reference
            similarity_score: 0.7, // Higher score for code references
            match_context: `Found in ${item.path}`,
            code_match: {
              path: item.path,
              html_url: item.html_url
            }
          };
          uniqueCodeRepos.set(item.repository.full_name, codeRepo);
        }
      });
    }
    
    const codeRepos = Array.from(uniqueCodeRepos.values());
    console.log(`Found ${codeRepos.length} unique repositories with code matches`);

    // Define a type for the raw repository data from GitHub API
    interface RawGithubRepo {
      full_name: string;
      html_url: string;
      url: string;
      stargazers_count?: number;
      forks_count?: number;
      language?: string | null;
    }

    // Process repository search results
    const processedRepoItems = repoItems.map((repo: RawGithubRepo) => ({
      full_name: repo.full_name,
      html_url: repo.html_url,
      url: repo.url,
      stargazers_count: repo.stargazers_count || 0,
      forks_count: repo.forks_count || 0,
      language: repo.language || '',
      detection_type: 'url_mention' as const,
      reference_location: 'repo_metadata' as const,
      similarity_score: 0.4, // Lower score for metadata references
      match_context: 'Found in repository metadata'
    } as GithubRepo));
    
    console.log(`Processed ${processedRepoItems.length} repository items`);

    // Combine results, PRIORITIZING CODE REFERENCES
    const allRepos = new Map<string, GithubRepo>();
    
    // Add code search results FIRST to ensure they get priority
    codeRepos.forEach(repo => {
      allRepos.set(repo.full_name, repo);
    });
    
    // Add repository search results, but don't overwrite code references
    processedRepoItems.forEach(repo => {
      if (!allRepos.has(repo.full_name)) {
        // Only add if we don't already have this repo from code search
        allRepos.set(repo.full_name, {
          full_name: repo.full_name,
          html_url: repo.html_url,
          url: repo.url,
          stargazers_count: repo.stargazers_count || 0,
          forks_count: repo.forks_count || 0,
          language: repo.language || '',
          detection_type: 'url_mention' as const,
          reference_location: 'repo_metadata' as const,
          similarity_score: 0.4, // Lower score for metadata references
          match_context: 'Found in repository metadata'
        } as GithubRepo);
      } else {
        // If we already have this repo from code search, just update metadata fields
        const existingRepo = allRepos.get(repo.full_name)!;
        existingRepo.stargazers_count = repo.stargazers_count || existingRepo.stargazers_count;
        existingRepo.forks_count = repo.forks_count || existingRepo.forks_count;
        existingRepo.language = repo.language || existingRepo.language;
      }
    });
    
    // Convert combined results to array and sort them
    // Priority order: code references first, then HTML content matches, then metadata references
    const combinedItems = Array.from(allRepos.values());
    
    if (combinedItems.length === 0) {
      return [];
    }
    
    // Sort repositories: code references first, then by similarity score
    const sortedItems = combinedItems.sort((a, b) => {
      // First priority: code references
      if (a.reference_location === 'code_file' && b.reference_location !== 'code_file') {
        return -1;
      }
      if (a.reference_location !== 'code_file' && b.reference_location === 'code_file') {
        return 1;
      }
      
      // Second priority: HTML content matches
      if (a.detection_type === 'html_content' && b.detection_type !== 'html_content') {
        return -1;
      }
      if (a.detection_type !== 'html_content' && b.detection_type === 'html_content') {
        return 1;
      }
      
      // Third priority: similarity score (higher first)
      if (a.similarity_score !== b.similarity_score) {
        return (b.similarity_score || 0) - (a.similarity_score || 0);
      }
      
      // Fourth priority: stars count (higher first)
      return b.stargazers_count - a.stargazers_count;
    });
    
    // Continue with the sorted results
    const data = { items: sortedItems };

    // Fetch HTML content of the URL to check for content matches
    let htmlContent = "";
    try {
      const htmlResponse = await fetch(url, {
        headers: {
          'User-Agent': 'PearlTracker/1.0',
        }
      });
      if (htmlResponse.ok) {
        htmlContent = await htmlResponse.text();
        // Normalize and clean HTML content
        htmlContent = htmlContent.toLowerCase().replace(/\s+/g, ' ').trim();
      }
    } catch (error) {
      console.warn(`Failed to fetch HTML content from ${url}:`, error);
      // Continue with URL-only detection
    }

    // Get details for each repository
    const repositories = await Promise.all(
      data.items.slice(0, 30).map(async (repo: GithubRepo) => {
        // Fetch repository details
        const repoResponse = await fetch(repo.url, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'PearlTracker/1.0',
            'Authorization': `token ${token}`,
          }
        });

        if (!repoResponse.ok) {
          console.warn(`Failed to get details for ${repo.full_name}: ${repoResponse.status}`);
          return null;
        }

        const repoDetails = await repoResponse.json();
        
        // Get top files from the repository
        const filesResponse = await fetch(`${repo.url}/contents`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'PearlTracker/1.0',
            'Authorization': `token ${token}`,
          }
        });

        const files = filesResponse.ok ? await filesResponse.json() : [];
        
        // Determine detection type and score based on available information
        let detectionType = 'url_mention'; // Default type
        let referenceLocation = 'repo_metadata'; // Default location
        let matchContext = '';
        let similarityScore = 0.4; // Default score for URL mentions
        
        // If this repo has a code match from code search
        if (repo.code_match) {
          referenceLocation = 'code_file';
          matchContext = `Found in ${repo.code_match.path}`;
          similarityScore = 0.6; // Higher score for code file references
        }

        // If we have HTML content, check for content matches
        if (htmlContent && files.length > 0) {
          // For each file that's a reasonable size, check if it contains HTML content
          const contentMatchPromises = files
            .filter((file: GithubFile) => file.type === 'file' && file.size < 100000)
            .map(async (file: GithubFile) => {
              try {
                // Only check certain file types that might contain HTML
                if (!file.html_url || !file.html_url.match(/\.(html|htm|jsx|tsx|js|ts|md|txt)$/i)) {
                  return null;
                }

                const fileContentResponse = await fetch(file.html_url, {
                  headers: {
                    'User-Agent': 'PearlTracker/1.0',
                    'Authorization': `token ${token}`,
                  }
                });

                if (!fileContentResponse.ok) return null;

                const fileContent = await fileContentResponse.text();
                const normalizedContent = fileContent.toLowerCase().replace(/\s+/g, ' ').trim();

                // Check if file contains significant portions of the HTML content
                // For simplicity, we're just checking if it contains at least 100 characters of the HTML
                if (htmlContent.length > 100) {
                  const contentChunks = htmlContent.match(/.{1,100}/g) || [];
                  for (const chunk of contentChunks.slice(0, 5)) { // Check first 5 chunks only
                    if (normalizedContent.includes(chunk)) {
                      return {
                        file: file.html_url,
                        matchType: 'html_content',
                        matchContext: chunk
                      };
                    }
                  }
                }

                // Check if file contains the title or description
                // if (title && normalizedContent.includes(title.toLowerCase())) {
                //   return {
                //     file: file.html_url,
                //     matchType: 'html_content',
                //     matchContext: `Contains title: ${title}`
                //   };
                // }

                // if (description && normalizedContent.includes(description.toLowerCase())) {
                //   return {
                //     file: file.html_url,
                //     matchContext: `Contains description: ${description.substring(0, 50)}...`
                //   };
                // }

                return null;
              } catch (error) {
                console.warn(`Error checking file content for ${file.html_url}:`, error);
                return null;
              }
            });

          const contentMatches = (await Promise.all(contentMatchPromises)).filter(match => match !== null);
          
          if (contentMatches.length > 0) {
            detectionType = 'html_content';
            matchContext = contentMatches[0]?.matchContext || 'HTML content match found';
            similarityScore = 0.75; // Higher score for content matches
          } else if (files.some((file: GithubFile) => file.type === 'file' && file.html_url && file.html_url.match(/\.(html|htm|jsx|tsx)$/i))) {
            detectionType = 'code';
            similarityScore = 0.6; // Medium score for code files but no direct content match
          }
        }

        return {
          full_name: repoDetails.full_name,
          html_url: repoDetails.html_url,
          similarity_score: similarityScore,
          detection_type: detectionType,
          reference_location: referenceLocation,
          match_context: matchContext,
          file_links: files
            .filter((file: GithubFile) => file.type === 'file' && file.size < 100000) // Filter to reasonable file sizes
            .map((file: GithubFile) => file.html_url),
          stargazers_count: repoDetails.stargazers_count,
          forks_count: repoDetails.forks_count,
          language: repoDetails.language,
          code_match: repo.code_match
        } as RepositoryDetails;
      })
    );

    const validRepos = repositories.filter((repo): repo is RepositoryDetails => repo !== null);

    return [
      {
        modelName: 'Github Repositories',
        contentType: 'code',
        confidenceLevel: validRepos.length,
        source: `${validRepos.length} related repositories`,
        lastDetected: new Date().toISOString(),
        data: {
          repositories: validRepos
        }
      }
    ];
  } catch (error) {
    console.error('Error in GitHub detection:', error);
    return [];
  }
}

// Main detection function
async function runDetection(url: string, source: string, year?: string, title?: string, description?: string): Promise<AIModelDetection[]> {
  if (source === "common-crawl" && !USE_COMMON_CRAWL_API) {
    console.log("Common Crawl API is currently disabled.");
    return [];
  }
  if (source === "wayback-machine" && !USE_WAYBACK_MACHINE_API) {
    console.log("Wayback Machine API is currently disabled.");
    return [];
  }
  if (source === "github-repos" && !USE_GITHUB_API) {
    console.log("Github API is currently disabled.");
    return [];
  }

  console.log(`Running detection for source: ${source}, year: ${year}`)

  switch (source) {
    case 'common-crawl':
      if (!year) {
        console.error('Year is required for common-crawl detection');
        return [];
      }
      return detectCommonCrawlByYear(url, year);
    case 'wayback-machine':
      return detectWaybackMachine(url);
    case 'github-repos':
      return detectGithubRepos(url, title, description);
    default:
      console.error(`Unknown source: ${source}`);
      return [];
  }
}

interface DetectionRequestWithYear extends DetectionRequest {
  year?: string
  title?: string
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const { url, source = "common-crawl", year = "2025", title, description }: DetectionRequestWithYear = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    console.log(`Starting detection for: ${url} using source: ${source}${year ? ` (${year})` : ""}`)

    const aiModels = await runDetection(url, source, year, title, description)

    const result: DetectionResult = {
      aiModels,
      copycatSites: [],
      analysisComplete: true,
      lastAnalyzed: new Date().toISOString(),
    }

    console.log(`Detection complete: ${aiModels.length} detections from ${source}`)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Detection analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze website" }, { status: 500 })
  }
}

// Get available sources
export async function GET() {
  return NextResponse.json({
    sources: DETECTION_SOURCES,
  })
}
