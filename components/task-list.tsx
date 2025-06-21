"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Calendar, User, AlertTriangle, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"

interface Task {
  id: string
  subject: string
  description: string
  dueDate: string
  priority: string
  status: string
  owner: {
    id: string
    name: string
  } | null
  relatedLeadId: string | null
  contactId: string | null
  createdTime: string
  modifiedTime: string
  closedTime: string | null
}

interface TaskListProps {
  tasks: Task[]
  loading: boolean
  onTaskUpdate: (taskId: string, newStatus: string) => void
}

export function TaskList({ tasks, loading, onTaskUpdate }: TaskListProps) {
  const [sortField, setSortField] = useState<keyof Task>("dueDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const router = useRouter()

  const handleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleTaskComplete = async (taskId: string) => {
    setUpdatingTasks((prev) => new Set(prev).add(taskId))
    try {
      await onTaskUpdate(taskId, "Completed")
    } finally {
      setUpdatingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleViewLead = (leadId: string) => {
    // Simply navigate to chat - lead details will be fetched there
    router.push(`/chat/${leadId}`)
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]

    // Handle nested owner object
    if (sortField === "owner") {
      aValue = a.owner?.name || ""
      bValue = b.owner?.name || ""
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.localeCompare(bValue)
      return sortDirection === "asc" ? comparison : -comparison
    }

    return 0
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800"
      case "Open":
        return "bg-blue-100 text-blue-800"
      case "In Progress":
        return "bg-orange-100 text-orange-800"
      case "Deferred":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "Completed") return false
    const today = new Date().toISOString().split("T")[0]
    return dueDate && dueDate < today
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date"
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
            <span>Loading tasks...</span>
          </div>
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No tasks found</h3>
          <p className="text-sm">No tasks match your current filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("subject")}
              >
                Subject {sortField === "subject" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("dueDate")}
              >
                Due Date {sortField === "dueDate" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("priority")}
              >
                Priority {sortField === "priority" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("status")}
              >
                Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead & Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="flex items-center">
                    {isOverdue(task.dueDate, task.status) && <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{task.subject}</div>
                      {task.owner && (
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <User className="w-3 h-3 mr-1" />
                          {task.owner.name}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">{task.description || "No description"}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900">{formatDate(task.dueDate)}</div>
                  {isOverdue(task.dueDate, task.status) && (
                    <div className="text-xs text-red-600 font-medium">Overdue</div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                </td>
                <td className="px-4 py-4">
                  <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {task.relatedLeadId ? (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Lead ID: {task.relatedLeadId}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No lead</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {task.status !== "Completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTaskComplete(task.id)}
                          disabled={updatingTasks.has(task.id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {updatingTasks.has(task.id) ? "..." : "Complete"}
                        </Button>
                      )}
                      {task.relatedLeadId && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleViewLead(task.relatedLeadId!)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
