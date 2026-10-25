"use client"

import * as React from "react"
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Patch sonner's global toast methods once so notifications across the entire ERP:
// 1. Replace in-place via a shared default ID (never stack on top of each other)
// 2. Auto-dismiss cleanly in 2.5 seconds (2500ms)
// 3. Always show a clickable '×' close button
const DEFAULT_TOAST_ID = "scj-active-notification"
const DEFAULT_DURATION_MS = 2500

const patchSonnerToast = () => {
  const globalAny = sonnerToast as any
  if (globalAny.__scjPatched) return
  globalAny.__scjPatched = true

  const wrapMethod = (origFn: any, defaultDuration = DEFAULT_DURATION_MS) => {
    return (message: any, data?: any) => {
      const mergedOptions = {
        ...(data || {}),
        id: data?.id || DEFAULT_TOAST_ID,
        duration:
          typeof data?.duration === "number" && data.duration <= 3000
            ? data.duration
            : defaultDuration,
        closeButton: true,
      }
      return origFn(message, mergedOptions)
    }
  }

  if (typeof globalAny.success === "function") {
    globalAny.success = wrapMethod(globalAny.success.bind(sonnerToast), DEFAULT_DURATION_MS)
  }
  if (typeof globalAny.info === "function") {
    globalAny.info = wrapMethod(globalAny.info.bind(sonnerToast), DEFAULT_DURATION_MS)
  }
  if (typeof globalAny.warning === "function") {
    globalAny.warning = wrapMethod(globalAny.warning.bind(sonnerToast), DEFAULT_DURATION_MS)
  }
  if (typeof globalAny.error === "function") {
    globalAny.error = wrapMethod(globalAny.error.bind(sonnerToast), 3000)
  }
  if (typeof globalAny.message === "function") {
    globalAny.message = wrapMethod(globalAny.message.bind(sonnerToast), DEFAULT_DURATION_MS)
  }
  if (typeof globalAny.loading === "function") {
    globalAny.loading = wrapMethod(globalAny.loading.bind(sonnerToast), 3000)
  }
}

patchSonnerToast()

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      richColors
      closeButton
      expand={false}
      visibleToasts={1}
      duration={DEFAULT_DURATION_MS}
      gap={8}
      className="toaster group scj-toaster-root"
      icons={{
        success: <CircleCheckIcon className="size-4 shrink-0" />,
        info: <InfoIcon className="size-4 shrink-0" />,
        warning: <TriangleAlertIcon className="size-4 shrink-0" />,
        error: <OctagonXIcon className="size-4 shrink-0" />,
        loading: <Loader2Icon className="size-4 shrink-0 animate-spin" />,
      }}
      toastOptions={{
        duration: DEFAULT_DURATION_MS,
        closeButton: true,
        classNames: {
          toast: "cn-toast scj-toast-item",
          title: "scj-toast-title",
          description: "scj-toast-desc",
          closeButton: "scj-toast-close-btn",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

