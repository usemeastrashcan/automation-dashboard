"use client"

import type { Lead } from "@/types/kanban"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface LeadCardProps {
  lead: Lead
}

export function LeadCard({ lead }: LeadCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/chat/${lead.id}`)
  }

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50" onClick={handleCardClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm">{lead.name}</h4>
          <Badge
            variant={lead.status === "active" ? "default" : lead.status === "completed" ? "secondary" : "outline"}
            className="text-xs"
          >
            {lead.status}
          </Badge>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            <span>{lead.company}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            <span className="truncate">{lead.email}</span>
          </div>

          {lead.phone && (
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span>{lead.phone}</span>
            </div>
          )}

          {lead.activity && (
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
              <span className="truncate text-blue-600">{lead.activity}</span>
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</div>
      </CardContent>
    </Card>
  )
}
