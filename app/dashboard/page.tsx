"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { TaskFilters } from "@/components/task-filters"
import { TaskList } from "@/components/task-list"
import { AlertCircle } from "lucide-react"

interface RelatedLead {
  id: string
  name: string
  company: string
  email: string
  activity?: string
}

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
  relatedLead: RelatedLead | null // Add this line
  contactId: string | null
  createdTime: string
  modifiedTime: string
  closedTime: string | null
}

interface User {
  id: string
  name: string
  email: string
  status: string
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    ownerId: process.env.NEXT_PUBLIC_DASHBOARD_USER_ID || "",
    status: "Open",
    dateRange: "today",
    priority: "All",
  })

  // Load users on component mount - add delay for proper initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Load tasks when filters change
  useEffect(() => {
    loadTasks()
  }, [filters])

  const loadUsers = async () => {
    try {
      console.log("🔄 Loading users...")
      const response = await fetch("/api/users")
      const data = await response.json()

      if (data.success) {
        setUsers(data.users)
        console.log(`✅ Loaded ${data.users.length} users`)

        // Set default user if not already set
        if (!filters.ownerId && data.users.length > 0) {
          const defaultUser =
            data.users.find(
              (u: User) => u.name.toLowerCase().includes("chris") || u.name.toLowerCase().includes("leadley"),
            ) || data.users[0]

          console.log(`🎯 Setting default user: ${defaultUser.name}`)
          setFilters((prev) => ({ ...prev, ownerId: defaultUser.id }))
        }
      } else {
        console.error("❌ Failed to load users:", data.message)
      }
    } catch (error) {
      console.error("❌ Failed to load users:", error)
    }
  }

  const loadTasks = async () => {
    if (!filters.ownerId) return

    setLoading(true)
    setError(null)

    // Add timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds

    try {
      const params = new URLSearchParams({
        ownerId: filters.ownerId,
        status: filters.status,
        dateRange: filters.dateRange,
        priority: filters.priority,
      })

      console.log("🔄 Loading tasks with filters:", filters)

      const response = await fetch(`/api/tasks?${params}`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setTasks(data.tasks)
        console.log(`✅ Loaded ${data.tasks.length} tasks`)
      } else {
        throw new Error(data.message || "Failed to load tasks")
      }
    } catch (err) {
      clearTimeout(timeoutId)

      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Please try again.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to load tasks")
      }
      console.error("❌ Tasks load error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const handleTaskUpdate = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Refresh tasks after update
        loadTasks()
      } else {
        console.error("Failed to update task")
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const selectedUser = users.find((u) => u.id === filters.ownerId)

  if (error) {
    const isRateLimit = error.includes("rate limit") || error.includes("wait") || error.includes("retry")

    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-10">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-600 mb-2">
              {isRateLimit ? "Temporary Service Delay" : "Error loading dashboard"}
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            {isRateLimit ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-600">
                  The system is automatically handling authentication. Please wait a moment and try again.
                </p>
                <button onClick={loadTasks} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
                  Try Again
                </button>
              </div>
            ) : (
              <button onClick={loadTasks} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Try Again
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold">Task Dashboard</h1>
            <p className="text-gray-600">
              {selectedUser ? `Showing tasks for ${selectedUser.name}` : "Select a user to view tasks"}
            </p>
          </div>

          {/* Filters */}
          <TaskFilters
            filters={filters}
            users={users}
            onFilterChange={handleFilterChange}
            onRefresh={loadTasks}
            loading={loading}
          />

          {/* Task List */}
          <TaskList tasks={tasks} loading={loading} onTaskUpdate={handleTaskUpdate} />
        </div>
      </main>
    </div>
  )
}
