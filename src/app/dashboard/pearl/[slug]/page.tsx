"use client";

import { useParams, useSearchParams } from "next/navigation";
import { usePearlContext } from "@/contexts/PearlContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Pearl } from "@/types/Pearl";
import DetectionAnalysis from "@/components/DetectionTable";

export default function PearlPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { pearls } = usePearlContext();
  const [pearl, setPearl] = useState<Pearl | null>(null);

  const decodedUrl = decodeURIComponent(params.slug as string);

  const titleFromQuery = searchParams.get("title");
  const descriptionFromQuery = searchParams.get("description");

  useEffect(() => {
    // First check if there's a pearl in context that matches the current URL
    const foundPearl = pearls.find((p) => p.content === decodedUrl);
    if (foundPearl) {
      foundPearl.createdAt = new Date(foundPearl.createdAt);
      setPearl(foundPearl);
      // Update localStorage with the current pearl
      localStorage.setItem("latestPearl", JSON.stringify(foundPearl));
      return;
    }
    
    // If not found in context, check localStorage
    const storedPearl = localStorage.getItem("latestPearl");
    if (storedPearl) {
      const parsedPearl = JSON.parse(storedPearl);
      
      // Only use the stored pearl if it matches the current URL
      if (parsedPearl.content === decodedUrl) {
        parsedPearl.createdAt = new Date(parsedPearl.createdAt);
        setPearl(parsedPearl);
        return;
      }
    }
    
    // If we get here, create a default pearl for this URL
    const defaultPearl = {
      id: `${Date.now()}-${decodedUrl}`,
      type: "url" as "url" | "image" | "file",
      content: decodedUrl,
      htmlContent: "<p>No HTML content available</p>", // Default HTML content
      metadata: {
        title: titleFromQuery || undefined,
        description: descriptionFromQuery || undefined,
        previewImage: undefined,
      },
      createdAt: new Date(),
    };
    setPearl(defaultPearl);
    localStorage.setItem("latestPearl", JSON.stringify(defaultPearl));
  }, [decodedUrl, pearls, titleFromQuery, descriptionFromQuery]);

  if (!pearl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {/* Header with back button */}
      <header className="w-full flex flex-row ">
        <Link href="/dashboard" className="flex flex-1">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="size-6 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex flex-1 flex-col justify-center items-center text-center gap-1">
          <h1 className="scroll-m-20 text-xl font-bold tracking-tight">
            PearlTracker Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyzing potential AI model usage for this website
          </p>
        </div>
        <div className="flex flex-1"></div>
      </header>

      {/* Website Preview Card */}
      <div className="w-full">
        <div className="bg-card border rounded-xl p-3 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Preview Image */}
            <div className="lg:w-1/6">
              <div className="aspect-video relative overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                {pearl.metadata?.previewImage ? (
                  <Image
                    alt="Website preview"
                    src={pearl.metadata.previewImage || "/placeholder.svg"}
                    fill
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="text-center p-8">
                    <p className="text-sm text-muted-foreground">
                      No preview available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Website Info */}
            <div className="lg:w-2/3 flex flex-col gap-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link
                    href={pearl.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit flex flex-row justify-center gap-1 items-center hover:underline text-sm text-muted-foreground bg-accent px-2 py-0.5 rounded-full"
                  >
                    <span className="">{pearl.content}</span>

                    <ExternalLink className="size-3" />
                  </Link>
                </div>

                {pearl.metadata?.title && (
                  <h2 className="text-xl font-semibold text-foreground">
                    {pearl.metadata.title}
                  </h2>
                )}

                {pearl.metadata?.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {pearl.metadata.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Added:</span>{" "}
                  {pearl.createdAt.toLocaleDateString()} at{" "}
                  {pearl.createdAt.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="w-full">
        <DetectionAnalysis
          url={pearl.content}
          title={pearl.metadata?.title || undefined}
          description={pearl.metadata?.description || undefined}
        />
      </div>
    </div>
  );
}
