"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, ExternalLink, AlertTriangle, Info } from "lucide-react"
import Image from "next/image"

interface VerificationHandlerProps {
  url: string
  verificationMethod: string
  screenshot: string
  onManualVerification: (url: string) => void
}

export default function VerificationHandler({
  url,
  verificationMethod,
  screenshot,
  onManualVerification,
}: VerificationHandlerProps) {

  const getVerificationInfo = (method: string) => {
    switch (method) {
      case "cloudflare":
        return {
          title: "Cloudflare Protection",
          description: "This website is protected by Cloudflare and requires browser verification.",
          icon: <Shield className="w-5 h-5" />,
          color: "orange",
        }
      case "captcha":
        return {
          title: "CAPTCHA Required",
          description: "This website requires solving a CAPTCHA to verify you are human.",
          icon: <AlertTriangle className="w-5 h-5" />,
          color: "yellow",
        }
      case "bot_detection":
        return {
          title: "Bot Detection",
          description: "This website has detected automated access and requires human verification.",
          icon: <Shield className="w-5 h-5" />,
          color: "red",
        }
      case "login_required":
        return {
          title: "Login Required",
          description: "This website requires you to sign in to access the content.",
          icon: <Info className="w-5 h-5" />,
          color: "blue",
        }
      default:
        return {
          title: "Verification Required",
          description: "This website requires human verification to access.",
          icon: <Shield className="w-5 h-5" />,
          color: "gray",
        }
    }
  }

  const handleRetry = async () => {
    onManualVerification(url)
  }


  const verificationInfo = getVerificationInfo(verificationMethod)

  return (
    <Card className="w-full max-w-sm py-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {verificationInfo.icon}
          {verificationInfo.title}
        </CardTitle>
        <CardDescription>{verificationInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        {/* Verification Screenshot */}
        <div className="aspect-video relative overflow-hidden rounded-lg border bg-muted">
          <Image
            alt="Verification page screenshot"
            src={`data:image/png;base64,${screenshot}`}
            fill
            className="object-cover object-top"
          />
        </div>

        {/* URL and Method Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 w-full">
            <span className="text-sm text-muted-foreground">URL:</span>
            <code className="text-sm bg-muted px-2 py-1 rounded w-full text-nowrap truncate">{url}</code>
          </div>
          {/* <Badge variant="outline">{verificationMethod}</Badge> */}
        </div>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            To analyze this website, you&apos;ll need to complete the verification by clicking &ldquo;Open & Verify&rdquo;.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleRetry} className="flex-1" variant="default">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open & Verify
          </Button>
          {/* <Button onClick={handleRetry} variant="outline" disabled={isRetrying} className="flex-1">
            {isRetrying ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Retry Analysis
          </Button> */}
        </div>

              </CardContent>
    </Card>
  )
}
