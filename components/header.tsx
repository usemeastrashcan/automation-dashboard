"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Header() {
  const pathname = usePathname()

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-2xl font-semibold">CRM Pipeline Tracking</h1>
        <nav className="mt-4">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className={`text-sm font-medium pb-2 ${
                pathname === "/dashboard" ? "border-b-2 border-blue-500" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/kanban"
              className={`text-sm font-medium pb-2 ${
                pathname === "/kanban" ? "border-b-2 border-blue-500" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kanban Board
            </Link>
            <Link
              href="/records"
              className={`text-sm font-medium pb-2 ${
                pathname === "/records" ? "border-b-2 border-blue-500" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Records
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
