import React from 'react';
import { TableMetadata, TableDataResponse } from '../../types';

interface DataGridProps {
  tableMetadata: TableMetadata;
  tableData: TableDataResponse | null;
  selectedRecord: Record<string, any> | null;
  onRecordSelect: (record: Record<string, any>) => void;
  loading: boolean;
  error: string | null;
}

export function DataGrid({ 
  tableMetadata, 
  tableData,
  selectedRecord,
  onRecordSelect,
  loading,
  error
}: DataGridProps) {
  
  if (loading) {
    return <p>Loading data...</p>;
  }
  
  if (error) {
    return <div className="text-red-600">{error}</div>;
  }
  
  if (!tableData || tableData.data.length === 0) {
    return <p>No data found.</p>;
  }
  
  return (
    <div className="overflow-x-auto shadow rounded-lg">
      <table className="min-w-full bg-white border border-gray-300 table-fixed" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-gray-100">
            {tableMetadata.columns.map(column => (
              <th 
                key={column.name}
                className="p-2 border-b border-gray-300 text-left font-medium max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                title={column.name}
              >
                {column.name}
              </th>
            ))}
            <th className="p-2 border-b border-gray-300 text-left font-medium w-24">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {tableData.data.map((record, index) => (
            <tr 
              key={index}
              className={`border-b border-gray-300 hover:bg-gray-50 ${
                selectedRecord === record ? 'bg-blue-50' : ''
              }`}
            >
              {tableMetadata.columns.map(column => (
                <td 
                  key={column.name} 
                  className="p-2 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                  title={column.dataType.toLowerCase() === 'image' || 
                        column.dataType.toLowerCase() === 'binary' || 
                        column.dataType.toLowerCase() === 'varbinary' 
                          ? 'Binary data' 
                          : String(record[column.name] !== null ? record[column.name] : '')}
                >
                  {column.dataType.toLowerCase() === 'image' || 
                   column.dataType.toLowerCase() === 'binary' || 
                   column.dataType.toLowerCase() === 'varbinary' 
                    ? (
                      record[column.name] 
                        ? (typeof record[column.name] === 'string' && record[column.name].startsWith('data:image/') 
                            ? <img src={record[column.name]} alt="Preview" className="max-h-8 max-w-full" />
                            : '[Binary data]') 
                        : '')
                    : String(record[column.name] !== null ? record[column.name] : '')}
                </td>
              ))}
              <td className="p-2">
                <button
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => onRecordSelect(record)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}