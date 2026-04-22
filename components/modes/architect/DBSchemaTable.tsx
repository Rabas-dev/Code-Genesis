import type { DBTable } from '@/types'
import { Key, Link } from 'lucide-react'

interface DBSchemaTableProps {
  tables: DBTable[]
}

export function DBSchemaTable({ tables }: DBSchemaTableProps) {
  return (
    <div className="space-y-4 pt-2">
      {tables.map((table) => (
        <div key={table.name} className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/30 border-b border-border">
            <span className="text-sm font-bold font-mono text-blue-400">{table.name}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Field</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Constraints</th>
              </tr>
            </thead>
            <tbody>
              {table.fields.map((field) => (
                <tr key={field.name} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono flex items-center gap-1.5">
                    {field.isPrimary && <Key className="w-3 h-3 text-amber-400 shrink-0" />}
                    {field.isForeign && <Link className="w-3 h-3 text-blue-400 shrink-0" />}
                    {!field.isPrimary && !field.isForeign && <span className="w-3" />}
                    {field.name}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground font-mono">{field.type}</td>
                  <td className="px-4 py-2">
                    {field.isPrimary && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0.5 rounded">PK</span>
                    )}
                    {field.isForeign && (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] px-1.5 py-0.5 rounded">FK</span>
                    )}
                    {field.nullable === false && !field.isPrimary && (
                      <span className="ml-1 text-muted-foreground text-[10px]">NOT NULL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
