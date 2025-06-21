"use client"

import { useState, useEffect } from "react"
import { Search, LucideUser, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface User {
  id: string
  name: string
  email: string
  status: string
}

interface UserSearchProps {
  users: User[]
  selectedUserId: string
  onUserSelect: (userId: string) => void
  loading?: boolean
}

export function UserSearch({ users, selectedUserId, onUserSelect, loading = false }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users)

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Assigned User</label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between" disabled={loading || users.length === 0}>
            <div className="flex items-center gap-2">
              <LucideUser className="w-4 h-4" />
              <span className="truncate">
                {selectedUser ? selectedUser.name : users.length === 0 ? "No users available" : "Select user..."}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm ? `No users found for "${searchTerm}"` : "No users available"}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  onClick={() => {
                    onUserSelect(user.id)
                    setSearchTerm("")
                  }}
                  className={`cursor-pointer ${selectedUserId === user.id ? "bg-accent" : ""}`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
