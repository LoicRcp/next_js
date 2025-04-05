"use client"

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const knowledgeData = [
  {
    id: 1,
    concept: "Machine Learning",
    type: "Technology",
    lastAccessed: "2023-04-15",
    connections: 8
  },
  {
    id: 2,
    concept: "Quantum Physics",
    type: "Science",
    lastAccessed: "2023-04-10",
    connections: 5
  },
  {
    id: 3,
    concept: "Personal Knowledge Management",
    type: "Productivity",
    lastAccessed: "2023-04-18",
    connections: 12
  },
  {
    id: 4,
    concept: "Second Brain",
    type: "Productivity",
    lastAccessed: "2023-04-17",
    connections: 9
  },
  {
    id: 5,
    concept: "Graph Databases",
    type: "Technology",
    lastAccessed: "2023-04-14",
    connections: 7
  }
]

export function DataTable() {
  return (
    <div className="h-full w-full">
      <Table>
        <TableCaption>Knowledge Base Entries</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">ID</TableHead>
            <TableHead>Concept</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Last Accessed</TableHead>
            <TableHead className="text-right">Connections</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {knowledgeData.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.id}</TableCell>
              <TableCell>{item.concept}</TableCell>
              <TableCell>{item.type}</TableCell>
              <TableCell>{item.lastAccessed}</TableCell>
              <TableCell className="text-right">{item.connections}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
