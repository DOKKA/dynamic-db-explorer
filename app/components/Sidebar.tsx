import React from 'react';
import { SchemaResponse } from '../types';

interface SidebarProps {
  schema: SchemaResponse | null;
  selectedTable: string | null;
  onTableSelect: (tableName: string) => void;
}

export function Sidebar({ schema, selectedTable, onTableSelect }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-300 overflow-y-auto">
      <div className="p-4">
        <h2 className="font-bold mb-2">Tables</h2>
        {schema && (
          <ul className="space-y-1">
            {schema.tables.map(table => (
              <li key={table.name}>
                <button
                  className={`w-full text-left px-2 py-1 rounded ${
                    selectedTable === table.name 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-200'
                  }`}
                  onClick={() => onTableSelect(table.name)}
                >
                  {table.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}