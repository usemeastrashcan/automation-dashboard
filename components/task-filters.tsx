"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserSearch } from "@/components/user-search"

interface User {
  id: string
  name: string
  email: string
  status: string
}

interface TaskFiltersProps {
  filters: {
    ownerId: string
    status: string
    dateRange: string
    priority: string
  }
  users: User[]
  onFilterChange: (filters: Partial<TaskFiltersProps["filters"]>) => void
  onRefresh: () => void
  loading: boolean
}

export function TaskFilters({ filters, users, onFilterChange, onRefresh, loading }: TaskFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Filters</h3>
        <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* User Search */}
        <UserSearch
          users={users}
          selectedUserId={filters.ownerId}
          onUserSelect={(userId) => onFilterChange({ ownerId: userId })}
          loading={loading}
        />

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <Select value={filters.status} onValueChange={(value) => onFilterChange({ status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Deferred">Deferred</SelectItem>
              <SelectItem value="All">All Statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Date Range</label>
          <Select value={filters.dateRange} onValueChange={(value) => onFilterChange({ dateRange: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="next_week">Next Week</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="all">All Dates</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Priority</label>
          <Select value={filters.priority} onValueChange={(value) => onFilterChange({ priority: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="All">All Priorities</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
