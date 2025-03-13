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

  // Define tabs with only the Edit tab
  const tabs: Tab[] = [
    {
      id: 'edit',
      label: 'Edit',
      content: renderEditForm(),
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
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
      />
    </div>
  );
}