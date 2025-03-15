import React, { useState, useEffect } from 'react';
import { TableMetadata, ForeignKeyMetadata, SchemaResponse } from '../../types';
import { Tabs, Tab } from './Tabs';

interface RecordFormProps {
  tableMetadata: TableMetadata;
  selectedRecord: Record<string, any> | null;
  formData: Record<string, any>;
  isEditing: boolean;
  isSaving: boolean;
  relatedData: Record<string, any[]>;
  loadingRelatedData: boolean;
  schema: SchemaResponse | null;
  onFieldChange: (fieldName: string, value: any) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  isForeignKey: (columnName: string) => ForeignKeyMetadata | undefined;
  getDisplayField: (relatedData: any[]) => string;
  fetchTableData: (tableName: string, page?: number) => Promise<void>;
}

export function RecordForm({
  tableMetadata,
  selectedRecord,
  formData,
  isEditing,
  isSaving,
  relatedData,
  loadingRelatedData,
  schema,
  onFieldChange,
  onSave,
  onDelete,
  onCancel,
  isForeignKey,
  getDisplayField,
  fetchTableData
}: RecordFormProps) {
  if (!isEditing) {
    return null;
  }

  // State for related tables data
  const [relatedTables, setRelatedTables] = useState<{
    tableName: string;
    data: any[];
    loading: boolean;
    error: string | null;
    page: number;
    total: number;
  }[]>([]);

  // Function to find tables that have a foreign key to the current table
  const findRelatedTables = () => {
    if (!schema || !selectedRecord || !tableMetadata) return [];
    
    const relatedTablesFound: { tableName: string; foreignKey: ForeignKeyMetadata }[] = [];
    
    // Look through all tables in the schema
    schema.tables.forEach(table => {
      // Check if any of this table's foreign keys reference our current table
      table.foreignKeys.forEach(fk => {
        if (fk.referencedTable === tableMetadata.name) {
          relatedTablesFound.push({
            tableName: table.name,
            foreignKey: fk
          });
        }
      });
    });
    
    return relatedTablesFound;
  };

  // Load data for related tables when a record is selected
  useEffect(() => {
    const loadRelatedTablesData = async () => {
      if (!selectedRecord || !schema) return;
      
      const relations = findRelatedTables();
      if (relations.length === 0) return;
      
      // Initialize related tables state
      const initialRelatedTables = relations.map(relation => ({
        tableName: relation.tableName,
        data: [],
        loading: true,
        error: null,
        page: 1,
        total: 0
      }));
      
      setRelatedTables(initialRelatedTables);
      
      // Load data for each related table
      const updatedRelatedTables = await Promise.all(
        relations.map(async (relation, index) => {
          try {
            const foreignKeyColumn = relation.foreignKey.columnName;
            const referencedColumn = relation.foreignKey.referencedColumn;
            
            // Use the value from the primary record
            const primaryKeyValue = selectedRecord[referencedColumn];
            if (primaryKeyValue === undefined) {
              return {
                ...initialRelatedTables[index],
                loading: false,
                error: `Reference column value not found: ${referencedColumn}`
              };
            }
            
            // Fetch related records
            const encodedTableName = encodeURIComponent(relation.tableName);
            const response = await fetch(
              `/api/tables/${encodedTableName}?page=1&pageSize=100&filter=${encodeURIComponent(`${foreignKeyColumn} = '${primaryKeyValue}'`)}`
            );
            
            if (!response.ok) {
              throw new Error(`Failed to fetch related data for ${relation.tableName}`);
            }
            
            const result = await response.json();
            
            return {
              ...initialRelatedTables[index],
              data: result.data || [],
              total: result.total || 0,
              loading: false
            };
          } catch (err: any) {
            return {
              ...initialRelatedTables[index],
              loading: false,
              error: err.message || `Error loading related data for ${relation.tableName}`
            };
          }
        })
      );
      
      setRelatedTables(updatedRelatedTables);
    };
    
    loadRelatedTablesData();
  }, [selectedRecord, schema]);

  // Function to render a related table tab
  const renderRelatedTableTab = (relationInfo: {
    tableName: string;
    data: any[];
    loading: boolean;
    error: string | null;
    page: number;
    total: number;
  }) => {
    const { tableName, data, loading, error, page, total } = relationInfo;
    
    // Find the table metadata for this related table
    const relatedTableMetadata = schema?.tables.find(t => t.name === tableName);
    if (!relatedTableMetadata) {
      return <div className="p-4">Table metadata not found for {tableName}</div>;
    }
    
    if (loading) {
      return <div className="p-4">Loading related data...</div>;
    }
    
    if (error) {
      return <div className="p-4 text-red-600">{error}</div>;
    }
    
    if (data.length === 0) {
      return <div className="p-4">No related records found.</div>;
    }
    
    // Handle page change for this related table
    const handlePageChange = (newPage: number) => {
      setRelatedTables(prev => 
        prev.map(rt => rt.tableName === tableName ? { ...rt, page: newPage } : rt)
      );
      
      // Fetch new data with the updated page
      // This would ideally be in a useEffect, but for simplicity we're handling it here
      // For a complete implementation, you would need to track pagination state for each related table
    };
    
    return (
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-medium">Related Records in {tableName}</h3>
          <button 
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            onClick={() => {
              // Handle adding a new related record
              // This would create a new record with the foreign key set to the primary record's ID
              alert('Add new related record functionality would be implemented here');
            }}
          >
            Add New
          </button>
        </div>
        
        <div className="overflow-x-auto shadow rounded-lg">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                {relatedTableMetadata.columns.slice(0, 6).map(column => (
                  <th 
                    key={column.name}
                    className="p-2 border-b border-gray-300 text-left font-medium"
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
              {data.map((record, index) => (
                <tr 
                  key={index}
                  className="border-b border-gray-300 hover:bg-gray-50"
                >
                  {relatedTableMetadata.columns.slice(0, 6).map(column => (
                    <td 
                      key={column.name} 
                      className="p-2 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                      {record[column.name] !== null ? String(record[column.name]) : ''}
                    </td>
                  ))}
                  <td className="p-2 space-x-2">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => {
                        // Handle viewing/editing the related record
                        alert(`Edit record ${JSON.stringify(record)} from ${tableName}`);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={() => {
                        // Handle deleting the related record
                        if (confirm(`Are you sure you want to delete this record from ${tableName}?`)) {
                          alert('Delete functionality would be implemented here');
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Simple pagination */}
        {total > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm">
              Showing {(page - 1) * 100 + 1} to {Math.min(page * 100, total)} of {total} records
            </p>
            <div className="flex space-x-2">
              <button
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                disabled={page * 100 >= total}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Form with action buttons at the bottom
  const renderEditForm = () => (
    <div className="bg-white p-4">
      <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tableMetadata.columns.map(column => (
          <div key={column.name} className="flex flex-col">
            <label className="mb-1 font-medium truncate" title={column.name}>
              {column.name}
              {!column.isNullable && <span className="text-red-600">*</span>}
              {column.isIdentity === 1 && <span className="text-gray-500 ml-1">(ID)</span>}
            </label>
            {column.isIdentity === 1 ? (
              <input
                type="text"
                className="border border-gray-300 p-2 rounded bg-gray-100"
                value={formData[column.name] || ''}
                disabled={true}
                title="Identity column (auto-generated)"
              />
            ) : isForeignKey(column.name) ? (
              <select
                className="border border-gray-300 p-2 rounded"
                value={formData[column.name] || ''}
                onChange={e => onFieldChange(column.name, e.target.value)}
                disabled={loadingRelatedData}
              >
                <option value="">
                  {loadingRelatedData ? 'Loading...' : '-- Select --'}
                </option>
                {relatedData[column.name]?.map(relatedItem => {
                  const fk = isForeignKey(column.name);
                  const referencedField = fk ? fk.referencedColumn : 'id';
                  const displayField = getDisplayField(relatedData[column.name]);
                  
                  if (!relatedItem[referencedField]) return null;
                  
                  return (
                    <option 
                      key={relatedItem[referencedField]} 
                      value={relatedItem[referencedField]}
                    >
                      {relatedItem[referencedField]} {relatedItem[displayField] ? `- ${relatedItem[displayField]}` : ''}
                    </option>
                  );
                })}
              </select>
            ) : column.dataType.toLowerCase().includes('text') || 
               (column.maxLength && column.maxLength > 255) ? (
              <textarea
                className="border border-gray-300 p-2 rounded h-24 resize-y"
                value={formData[column.name] || ''}
                onChange={e => onFieldChange(column.name, e.target.value)}
              />
            ) : column.dataType.toLowerCase().includes('date') ? (
              <input
                type="date"
                className="border border-gray-300 p-2 rounded"
                value={formData[column.name] ? new Date(formData[column.name]).toISOString().split('T')[0] : ''}
                onChange={e => onFieldChange(column.name, e.target.value)}
              />
            ) : column.dataType.toLowerCase().includes('time') && !column.dataType.toLowerCase().includes('date') ? (
              <input
                type="time"
                className="border border-gray-300 p-2 rounded"
                value={formData[column.name] || ''}
                onChange={e => onFieldChange(column.name, e.target.value)}
              />
            ) : column.dataType.toLowerCase().includes('int') || 
               column.dataType.toLowerCase().includes('decimal') ||
               column.dataType.toLowerCase().includes('numeric') ||
               column.dataType.toLowerCase().includes('float') ||
               column.dataType.toLowerCase().includes('real') ? (
              <input
                type="number"
                className="border border-gray-300 p-2 rounded"
                value={formData[column.name] !== null && formData[column.name] !== undefined ? formData[column.name] : ''}
                onChange={e => onFieldChange(column.name, e.target.value === '' ? null : e.target.value)}
                step={column.dataType.toLowerCase().includes('decimal') || 
                     column.dataType.toLowerCase().includes('numeric') ||
                     column.dataType.toLowerCase().includes('float') ||
                     column.dataType.toLowerCase().includes('real') ? 'any' : '1'}
              />
            ) : column.dataType.toLowerCase() === 'bit' ? (
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={Boolean(formData[column.name])}
                  onChange={e => onFieldChange(column.name, e.target.checked)}
                />
              </div>
            ) : column.dataType.toLowerCase() === 'image' || 
               column.dataType.toLowerCase() === 'binary' || 
               column.dataType.toLowerCase() === 'varbinary' ? (
              <div>
                <input
                  type="file"
                  className="border border-gray-300 p-2 rounded w-full"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64Data = reader.result as string;
                        onFieldChange(column.name, base64Data);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {formData[column.name] && typeof formData[column.name] === 'string' && 
                 formData[column.name].startsWith('data:image/') && (
                  <div className="mt-2">
                    <img 
                      src={formData[column.name]} 
                      alt="Preview" 
                      className="max-h-32 max-w-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                className="border border-gray-300 p-2 rounded"
                value={formData[column.name] !== null && formData[column.name] !== undefined ? formData[column.name] : ''}
                onChange={e => onFieldChange(column.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </form>
      <div className="mt-6 flex justify-between border-t border-gray-200 pt-4">
        {selectedRecord && (
          <button
            type="button"
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={onDelete}
            disabled={isSaving}
          >
            {isSaving ? 'Deleting...' : 'Delete'}
          </button>
        )}
        <div className="flex space-x-2 ml-auto">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );

  // Define base tabs (Edit tab is always present)
  const baseTabs: Tab[] = [
    {
      id: 'edit',
      label: 'Edit',
      content: renderEditForm(),
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
    }
  ];
  
  // Only show related tabs if we have a selected record
  const relationTabs: Tab[] = selectedRecord 
    ? relatedTables.map(relTable => ({
        id: `relation-${relTable.tableName}`,
        label: relTable.tableName,
        content: renderRelatedTableTab(relTable),
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3z" />
              </svg>
      }))
    : [];
  
  // Combine the base tabs with the dynamic relation tabs
  const tabs: Tab[] = [...baseTabs, ...relationTabs];

  return (
    <div className="border-t border-gray-300 bg-gray-50">
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">
          {selectedRecord ? 'Edit Record' : 'New Record'}
        </h3>
      </div>
      <Tabs 
        tabs={tabs} 
        defaultTab="edit" 
      />
    </div>
  );
}