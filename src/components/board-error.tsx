"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ColumnSkeletons() {
  return (
    <div className="flex flex-1 gap-3 overflow-x-auto">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  )
}

export function BoardError({ message }: { message: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  if (pending) return <ColumnSkeletons />
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{message}</CardTitle>
        </CardHeader>
        <CardFooter className="justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/settings">Open settings</Link>
          </Button>
          <Button
            type="button"
            onClick={() => {
              setPending(true)
              router.refresh()
            }}
          >
            Retry
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
