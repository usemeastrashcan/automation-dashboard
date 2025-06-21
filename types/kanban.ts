export interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone?: string
  status: "pending" | "active" | "completed"
  activity?: string
  createdAt: string
}

export interface Column {
  id: string
  title: string
  color: string
  leads: Lead[]
}

export type ColumnId = "leads" | "questionnaire" | "quotation" | "details-passed" | "lost-cases" | "others"
