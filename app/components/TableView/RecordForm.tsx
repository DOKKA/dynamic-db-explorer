import React from 'react';
import { TableMetadata, ForeignKeyMetadata } from '../../types';
import { Tabs, Tab } from './Tabs';

interface RecordFormProps {
  tableMetadata: TableMetadata;
  selectedRecord: Record<string, any> | null;
  formData: Record<string, any>;
  isEditing: boolean;
  isSaving: boolean;
  relatedData: Record<string, any[]>;
  loadingRelatedData: boolean;
  onFieldChange: (fieldName: string, value: any) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  isForeignKey: (columnName: string) => ForeignKeyMetadata | undefined;
  getDisplayField: (relatedData: any[]) => string;
}

export function RecordForm({
  tableMetadata,
  selectedRecord,
  formData,
  isEditing,
  isSaving,
  relatedData,
  loadingRelatedData,
  onFieldChange,
  onSave,
  onDelete,
  onCancel,
  isForeignKey,
  getDisplayField
}: RecordFormProps) {
  if (!isEditing) {
    return null;
  }

  const renderEditForm = () => (
    <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tableMetadata.columns.map(column => (
        <div key={column.name} className="flex flex-col">
          <label className="mb-1 font-medium truncate" title={column.name}>
            {column.name}
            {!column.isNullable && <span className="text-red-600">*</span>}
            {column.isIdentity === 1 && <span className="text-gray-500 ml-1">(ID)</span>}
          </label>
          {/* Check if this is an identity column */}
          {column.isIdentity === 1 ? (
            // Render disabled input for identity columns
            <input
              type="text"
              className="border border-gray-300 p-2 rounded bg-gray-100"
              value={formData[column.name] || ''}
              disabled={true}
              title="Identity column (auto-generated)"
            />
          ) : isForeignKey(column.name) ? (
            // Render dropdown for foreign key
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
                
                // Handle case where referenced field doesn't exist
                if (!relatedItem[referencedField]) {
                  return null;
                }
                
                return (
                  <option 
                    key={relatedItem[referencedField]} 
                    value={relatedItem[referencedField]}
                  >
                    {/* Show ID and name/title if available */}
                    {relatedItem[referencedField]} {relatedItem[displayField] ? `- ${relatedItem[displayField]}` : ''}
                  </option>
                );
              })}
            </select>
          ) : column.dataType.toLowerCase().includes('text') || 
             (column.maxLength && column.maxLength > 255) ? (
            // Render textarea for long text
            <textarea
              className="border border-gray-300 p-2 rounded h-24 resize-y"
              value={formData[column.name] || ''}
              onChange={e => onFieldChange(column.name, e.target.value)}
            />
          ) : column.dataType.toLowerCase().includes('date') ? (
            // Render date input
            <input
              type="date"
              className="border border-gray-300 p-2 rounded"
              value={formData[column.name] ? new Date(formData[column.name]).toISOString().split('T')[0] : ''}
              onChange={e => onFieldChange(column.name, e.target.value)}
            />
          ) : column.dataType.toLowerCase().includes('time') && !column.dataType.toLowerCase().includes('date') ? (
            // Render time input
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
            // Render number input
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
            // Render checkbox for bit/boolean
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
            // Render file input for binary data
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
            // Render regular input for other fields
            <input
              type="text"
              className="border border-gray-300 p-2 rounded"
              value={formData[column.name] !== null && formData[column.name] !== undefined ? formData[column.name] : ''}
              onChange={e => onFieldChange(column.name, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className="col-span-full mt-4 flex justify-between">
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
        <div className="flex space-x-2">
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
    </form>
  );

  // Placeholder content for additional tabs
  const renderDetailsTab = () => (
    <div className="p-4">
      <h4 className="text-lg font-medium mb-4">Record Details</h4>
      {selectedRecord ? (
        <div className="space-y-2">
          <p>Created: <span className="font-medium">N/A</span></p>
          <p>Last Modified: <span className="font-medium">N/A</span></p>
          <p>Record ID: <span className="font-medium">{tableMetadata.primaryKeys.map(pk => selectedRecord[pk]).join(', ')}</span></p>
        </div>
      ) : (
        <p className="text-gray-500">New record - no details available yet.</p>
      )}
    </div>
  );

  // JSON preview tab
  const renderJsonPreviewTab = () => (
    <div className="p-4">
      <h4 className="text-lg font-medium mb-4">JSON Preview</h4>
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px] text-sm">
        {JSON.stringify(formData, null, 2)}
      </pre>
    </div>
  );

  // Generate SQL statement for the current record
  const generateSqlStatement = () => {
    if (!tableMetadata) return '';

    const escapedValues = new Map<string, string>();
    
    // Process values and handle different data types
    for (const key in formData) {
      if (formData[key] === null || formData[key] === undefined) {
        escapedValues.set(key, 'NULL');
        continue;
      }
      
      const column = tableMetadata.columns.find(c => c.name === key);
      if (!column) continue;
      
      // Handle different data types
      const dataType = column.dataType.toLowerCase();
      if (dataType.includes('char') || dataType.includes('text') || 
          dataType.includes('date') || dataType.includes('time')) {
        // Escape strings and dates with quotes and handle single quotes
        let value = String(formData[key]).replace(/'/g, "''");
        escapedValues.set(key, `'${value}'`);
      } else if (dataType === 'bit') {
        // Handle boolean values
        escapedValues.set(key, formData[key] ? '1' : '0');
      } else if (dataType.includes('binary') || dataType === 'image') {
        // Skip binary data in SQL preview
        escapedValues.set(key, '[BINARY DATA]');
      } else {
        // Numeric types
        escapedValues.set(key, String(formData[key]));
      }
    }
    
    if (selectedRecord) {
      // Generate UPDATE statement
      const setClause = Object.keys(formData)
        .filter(key => !tableMetadata.primaryKeys.includes(key) && 
                       formData[key] !== selectedRecord[key])
        .map(key => `  [${key}] = ${escapedValues.get(key)}`)
        .join(',\n');
      
      const whereClause = tableMetadata.primaryKeys
        .map(key => `[${key}] = ${escapedValues.get(key) || `'${selectedRecord[key]}'`}`)
        .join(' AND ');
      
      if (!setClause) return 'No changes to update';
      
      return `UPDATE [${tableMetadata.name}]\nSET\n${setClause}\nWHERE ${whereClause};`;
    } else {
      // Generate INSERT statement
      const columns = Object.keys(formData)
        .filter(key => formData[key] !== null && formData[key] !== undefined)
        .filter(key => {
          const column = tableMetadata.columns.find(c => c.name === key);
          return column && column.isIdentity !== 1;
        });
      
      const values = columns.map(key => escapedValues.get(key));
      
      return `INSERT INTO [${tableMetadata.name}] (\n  ${columns.map(c => `[${c}]`).join(',\n  ')}\n)\nVALUES (\n  ${values.join(',\n  ')}\n);`;
    }
  };
  
  // SQL preview tab
  const renderSqlPreviewTab = () => (
    <div className="p-4">
      <h4 className="text-lg font-medium mb-4">SQL Preview</h4>
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px] text-sm font-mono">
        {generateSqlStatement()}
      </pre>
    </div>
  );

  // Action buttons for the form (moved from the edit form)
  const renderActionButtons = () => (
    <div className="flex justify-between">
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
  );

  // Modify the edit form to remove action buttons
  const modifiedEditForm = () => (
    <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tableMetadata.columns.map(column => (
        <div key={column.name} className="flex flex-col">
          <label className="mb-1 font-medium truncate" title={column.name}>
            {column.name}
            {!column.isNullable && <span className="text-red-600">*</span>}
            {column.isIdentity === 1 && <span className="text-gray-500 ml-1">(ID)</span>}
          </label>
          {/* Input fields from the original form */}
          {/* ... existing input field rendering logic ... */}
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
  );

  // Define tabs with icons
  const tabs: Tab[] = [
    {
      id: 'edit',
      label: 'Edit',
      content: modifiedEditForm(),
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
    },
    {
      id: 'json',
      label: 'JSON',
      content: renderJsonPreviewTab(),
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
    },
    {
      id: 'sql',
      label: 'SQL',
      content: renderSqlPreviewTab(),
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
            </svg>
    },
    {
      id: 'details',
      label: 'Details',
      content: renderDetailsTab(),
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
    }
  ];

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
        footerContent={renderActionButtons()}
      />
    </div>
  );
}