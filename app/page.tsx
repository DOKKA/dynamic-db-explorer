'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Define TypeScript interfaces for database schema
interface ColumnMetadata {
  name: string;
  dataType: string;
  isNullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

interface ForeignKeyMetadata {
  name: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyMetadata[];
}

interface SchemaResponse {
  tables: TableMetadata[];
}

interface TableDataResponse {
  data: Record<string, any>[];
  total: number;
}

export default function Home() {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch database schema on component mount
  useEffect(() => {
    fetchSchema();
  }, []);

  // Fetch table data when selected table changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, currentPage);
    }
  }, [selectedTable, currentPage]);

  // Fetch database schema
  const fetchSchema = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/schema');
      
      if (!response.ok) {
        throw new Error('Failed to fetch database schema');
      }
      
      const data: SchemaResponse = await response.json();
      setSchema(data);
      
      // Select the first table by default
      if (data.tables.length > 0) {
        setSelectedTable(data.tables[0].name);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the database schema');
      console.error('Error fetching schema:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch table data with pagination
  const fetchTableData = async (tableName: string, page: number = 1) => {
    try {
      setLoading(true);
      
      // Encode the table name properly for the URL
      const encodedTableName = encodeURIComponent(tableName);
      
      const response = await fetch(`/api/tables/${encodedTableName}?page=${page}&pageSize=50`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data for table ${tableName}`);
      }
      
      const data: TableDataResponse = await response.json();
      setTableData(data);
      setSelectedRecord(null);
      setFormData({});
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || `An error occurred while fetching data for table ${tableName}`);
      console.error(`Error fetching data for table ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setCurrentPage(1);
  };

  // Handle record selection
  const handleRecordSelect = (record: Record<string, any>) => {
    setSelectedRecord(record);
    setFormData({ ...record });
    setIsEditing(true);
  };

  // Handle new record creation
  const handleNewRecord = () => {
    setSelectedRecord(null);
    setFormData({});
    setIsEditing(true);
  };

  // Handle form field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Get selected table metadata
  const getSelectedTableMetadata = (): TableMetadata | null => {
    if (!schema || !selectedTable) return null;
    return schema.tables.find(table => table.name === selectedTable) || null;
  };
  
  // Save record (create or update)
  const handleSaveRecord = async () => {
    if (!selectedTable) return;
    
    try {
      setIsSaving(true);
      
      // Encode the table name properly for the URL
      const encodedTableName = encodeURIComponent(selectedTable);
      
      if (selectedRecord) {
        // Update existing record
        const tableMetadata = getSelectedTableMetadata();
        if (!tableMetadata) return;
        
        // Create where condition using primary keys
        const whereCondition = tableMetadata.primaryKeys
          .map(key => `[${key}] = '${selectedRecord[key]}'`)
          .join(' AND ');
        
        const response = await fetch(`/api/tables/${encodedTableName}/record`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: formData, whereCondition }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update record');
        }
      } else {
        // Create new record
        const response = await fetch(`/api/tables/${encodedTableName}/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create record');
        }
      }
      
      // Refresh table data
      await fetchTableData(selectedTable, currentPage);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the record');
      console.error('Error saving record:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Delete record
  const handleDeleteRecord = async () => {
    if (!selectedTable || !selectedRecord) return;
    
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Encode the table name properly for the URL
      const encodedTableName = encodeURIComponent(selectedTable);
      
      const tableMetadata = getSelectedTableMetadata();
      if (!tableMetadata) return;
      
      // Create where condition using primary keys
      const whereCondition = tableMetadata.primaryKeys
        .map(key => `[${key}] = '${selectedRecord[key]}'`)
        .join(' AND ');
      
      const response = await fetch(
        `/api/tables/${encodedTableName}/record?where=${encodeURIComponent(whereCondition)}`, 
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete record');
      }
      
      // Refresh table data
      await fetchTableData(selectedTable, currentPage);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the record');
      console.error('Error deleting record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Render loading state
  if (loading && !schema) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading database schema...</p>
      </div>
    );
  }

  // Render error state
  if (error && !schema) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-center">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={fetchSchema}
        >
          Retry
        </button>
      </div>
    );
  }

  // Get the current table metadata
  const tableMetadata = getSelectedTableMetadata();

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Dynamic DB Explorer</h1>
          <div className="flex items-center">
            <p className="text-sm">
              Connected to: {process.env.DB_NAME || 'Database'}
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
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
                      onClick={() => handleTableSelect(table.name)}
                    >
                      {table.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedTable && tableMetadata ? (
            <>
              {/* Table header */}
              <div className="bg-gray-200 p-4 border-b border-gray-300">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{selectedTable}</h2>
                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    onClick={handleNewRecord}
                  >
                    New Record
                  </button>
                </div>
              </div>

              {/* Data grid */}
              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <p>Loading data...</p>
                ) : error ? (
                  <div className="text-red-600">{error}</div>
                ) : tableData && tableData.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          {tableMetadata.columns.map(column => (
                            <th 
                              key={column.name}
                              className="p-2 border-b border-gray-300 text-left font-medium"
                            >
                              {column.name}
                            </th>
                          ))}
                          <th className="p-2 border-b border-gray-300 text-left font-medium">
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
                              <td key={column.name} className="p-2">
                                {String(record[column.name] !== null ? record[column.name] : '')}
                              </td>
                            ))}
                            <td className="p-2">
                              <button
                                className="text-blue-600 hover:text-blue-800"
                                onClick={() => handleRecordSelect(record)}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No data found.</p>
                )}

                {/* Pagination */}
                {tableData && tableData.total > 0 && (
                  <div className="mt-4 flex justify-between items-center">
                    <p>
                      Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, tableData.total)} of {tableData.total} records
                    </p>
                    <div className="flex space-x-2">
                      <button
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        Previous
                      </button>
                      <button
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                        disabled={currentPage * 50 >= tableData.total}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Record form */}
              {isEditing && tableMetadata && (
                <div className="border-t border-gray-300 p-4 bg-gray-50">
                  <h3 className="text-lg font-bold mb-4">
                    {selectedRecord ? 'Edit Record' : 'New Record'}
                  </h3>
                  <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tableMetadata.columns.map(column => (
                      <div key={column.name} className="flex flex-col">
                        <label className="mb-1 font-medium">
                          {column.name}
                          {!column.isNullable && <span className="text-red-600">*</span>}
                        </label>
                        <input
                          type="text"
                          className="border border-gray-300 p-2 rounded"
                          value={formData[column.name] || ''}
                          onChange={e => handleFieldChange(column.name, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="col-span-full mt-4 flex justify-between">
                      {selectedRecord && (
                        <button
                          type="button"
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          onClick={handleDeleteRecord}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                          onClick={() => setIsEditing(false)}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          onClick={handleSaveRecord}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a table from the sidebar to view data.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}