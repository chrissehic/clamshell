"use client";

import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { usePearlContext } from "@/contexts/PearlContext";
import Loading from "./loading";
import VerificationHandler from "@/components/VerificationHandler";
import type { Pearl } from "@/types/Pearl";

export default function Dashboard() {
  const { addPearl, pearls } = usePearlContext();
  const [urlInput, setUrlInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showClear, setShowClear] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState<{
    url: string;
    method: string;
    screenshot: string;
  } | null>(null);

  const fetchPreview = async (url: string, bypassVerification = false) => {
    try {
      const queryParams = new URLSearchParams({ url });
      if (bypassVerification) {
        queryParams.append("bypass", "true");
      }

      const response = await fetch(`/api/puppeteer?${queryParams}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch website preview");
      }

      const data = await response.json();

      // Check if verification is required
      if (data.requiresVerification) {
        setVerificationRequired({
          url: data.verificationUrl || url,
          method: data.verificationMethod || "unknown",
          screenshot: data.screenshot,
        });
        return null;
      }

      return data;
    } catch (err) {
      if (err instanceof Error) {
        setShowClear(true);
        setError(err.message || "An unexpected error occurred");
      } else {
        throw err;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setUrlInput(value);

    if (value.trim() === "") {
      setShowClear(false);
      setError("");
      setVerificationRequired(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!urlInput.trim()) {
      setShowClear(true);
      setError("Please enter a valid website URL");
      return;
    }
    setError("");
    setVerificationRequired(null);
    setLoading(true);

    const normalizedUrl =
      urlInput.startsWith("http://") || urlInput.startsWith("https://")
        ? urlInput
        : `https://${urlInput}`;

    const preview = await fetchPreview(normalizedUrl);
    setLoading(false);

    if (preview) {
      const pearl: Pearl = {
        id: `${Date.now()}-${normalizedUrl}`,
        type: "url",
        htmlContent: preview.htmlContent,
        content: normalizedUrl,
        metadata: {
          title: preview.metadata?.title || null,
          description: preview.metadata?.description || null,
          previewImage: `data:image/png;base64,${preview.screenshot}`,
        },
        createdAt: new Date(),
      };

      addPearl(pearl);
      localStorage.setItem("latestPearl", JSON.stringify(pearl));
      setUrlInput("");
    }
  };

  const handleManualVerification = async () => {
    if (!verificationRequired) return;

    setVerificationRequired(null);
    setLoading(true);

    const preview = await fetchPreview(verificationRequired.url, true);
    setLoading(false);

    if (preview) {
      const pearl: Pearl = {
        id: `${Date.now()}-${verificationRequired.url}`,
        type: "url",
        content: verificationRequired.url,
        metadata: {
          title: preview.metadata?.title || null,
          description: preview.metadata?.description || null,
          previewImage: `data:image/png;base64,${preview.screenshot}`,
        },
        createdAt: new Date(),
      };

      addPearl(pearl);
      setUrlInput("");
    }
  };

  const handleClear = () => {
    setUrlInput("");
    setShowClear(false);
    setError("");
    setVerificationRequired(null);
  };

  const hasContent = urlInput.trim() !== "";
  const latestPearl = pearls[pearls.length - 1];
  const hasPreview =
    loading || (latestPearl && latestPearl.metadata?.previewImage);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-3xl">
        <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
          PearlTracker
        </h2>
        <p className="leading-7 [&:not(:first-child)]:mt-3">
          Check if your website&apos;s data could be used by AI models without
          your knowledge
        </p>
      </div>
      <div className="flex flex-col justify-center items-center gap-8 w-full">
        {/* Verification Handler */}
        {verificationRequired && (
          <div className="w-full flex justify-center flex-col items-center max-w-3xl">
            <VerificationHandler
              url={verificationRequired.url}
              verificationMethod={verificationRequired.method}
              screenshot={verificationRequired.screenshot}
              onManualVerification={handleManualVerification}
            />
          </div>
        )}

        {/* Regular Preview */}
        {hasPreview && !verificationRequired && (
          <div className="w-full max-w-3xl flex flex-row items-center gap-6 bg-accent/40 p-2 rounded-3xl">
            <div className="aspect-video relative overflow-hidden w-full max-w-[16rem] rounded-2xl flex justify-center items-center">
              {loading ? (
                <Loading className="w-full bg-primary/10 h-full" />
              ) : latestPearl?.metadata?.previewImage ? (
                <a
                  href={latestPearl.content}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    alt="Website preview"
                    src={
                      latestPearl.metadata.previewImage || "/placeholder.svg"
                    }
                    fill
                    className="object-cover object-top"
                  />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No preview available
                </p>
              )}
            </div>

            {latestPearl?.metadata?.previewImage && !loading && (
              <div className="flex flex-row flex-1 justify-between items-center gap-2">
                <div className="flex flex-col gap-1 justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={latestPearl.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-fit flex flex-row justify-center gap-1 items-center hover:underline text-sm text-muted-foreground bg-accent px-2 py-0.5 rounded-full"
                    >
                      <span className="">{latestPearl.content}</span>

                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                  {latestPearl.metadata?.title && (
                    <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {latestPearl.metadata.title}
                    </h2>
                  )}
                  {latestPearl.metadata?.description && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {latestPearl.metadata.description}
                    </p>
                  )}
                </div>

                <Link
                  className={clsx(
                    buttonVariants({ variant: "default" }),
                    "mx-2"
                  )}
                  href={{
                    pathname: `/dashboard/pearl/${encodeURIComponent(
                      latestPearl.content
                    )}`,
                    query: {
                      title: latestPearl.metadata?.title,
                      description: latestPearl.metadata?.description,
                    },
                  }}
                >
                  Check AI usage
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="max-w-3xl w-full flex flex-col gap-2">
          <div className="w-full relative">
            <Input
              type="url"
              className="rounded-full px-6 py-4"
              placeholder="Enter website URL"
              value={urlInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              autoComplete="url"
            />
            {hasContent && (
              <Button
                onClick={showClear ? handleClear : handleSubmit}
                className="size-10 absolute right-4 top-0 bottom-0 m-auto"
                aria-label={showClear ? "Clear input" : "Search"}
                variant={showClear ? "ghost" : "default"}
              >
                {showClear ? (
                  <X className="size-6" />
                ) : (
                  <ArrowRight className="size-6" />
                )}
              </Button>
            )}
          </div>
          {hasContent && error && (
            <div className="bg-red-500/10 w-fit px-3 rounded-full">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
