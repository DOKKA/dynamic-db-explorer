import { useState, useEffect } from 'react';
import { ForeignKeyMetadata, TableMetadata } from '../types';

export function useRecordForm(tableMetadata: TableMetadata | null, selectedTable: string | null, fetchTableData: (tableName: string, page: number) => Promise<void>, currentPage: number) {
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [relatedData, setRelatedData] = useState<Record<string, any[]>>({});
  const [loadingRelatedData, setLoadingRelatedData] = useState<boolean>(false);

  // Handle record selection
  const handleRecordSelect = (record: Record<string, any>) => {
    setSelectedRecord(record);
    setFormData({ ...record });
    setIsEditing(true);
    
    // Fetch related data for dropdown options
    if (tableMetadata) {
      fetchRelatedData(tableMetadata.foreignKeys);
    }
  };

  // Handle new record creation
  const handleNewRecord = () => {
    setSelectedRecord(null);
    setFormData({});
    setIsEditing(true);
    
    // Fetch related data for dropdown options
    if (tableMetadata) {
      fetchRelatedData(tableMetadata.foreignKeys);
    }
  };

  // Handle form field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Check if a column is a foreign key
  const isForeignKey = (columnName: string): ForeignKeyMetadata | undefined => {
    if (!tableMetadata) return undefined;
    return tableMetadata.foreignKeys.find(fk => fk.columnName === columnName);
  };
  
  // Find display field for a foreign key (usually the first non-primary key field)
  const getDisplayField = (relatedData: any[]): string => {
    if (!relatedData || relatedData.length === 0) return 'id';
    
    const firstRecord = relatedData[0];
    const keys = Object.keys(firstRecord);
    
    // Try to find a good display field - prefer name, description, title, etc.
    const nameFields = ['name', 'title', 'description', 'label', 'display_name', 'display'];
    for (const field of nameFields) {
      if (keys.includes(field)) return field;
    }
    
    // If no good display field, just use the second field (assuming first is ID)
    return keys.length > 1 ? keys[1] : keys[0];
  };

  // Fetch related data for foreign keys
  const fetchRelatedData = async (foreignKeys: ForeignKeyMetadata[]) => {
    if (foreignKeys.length === 0) return;
    
    try {
      setLoadingRelatedData(true);
      const newRelatedData: Record<string, any[]> = {};
      
      // Process each foreign key
      for (const fk of foreignKeys) {
        const encodedTableName = encodeURIComponent(fk.referencedTable);
        console.log(`Fetching related data for ${fk.referencedTable}, column ${fk.columnName}`);
        
        const response = await fetch(`/api/tables/${encodedTableName}?page=1&pageSize=1000`);
        
        if (!response.ok) {
          console.error(`Failed to fetch related data for ${fk.referencedTable}`);
          continue;
        }
        
        const data = await response.json();
        
        // Store the related data
        newRelatedData[fk.columnName] = data.data;
        console.log(`Fetched ${data.data.length} records for ${fk.columnName}`);
      }
      
      setRelatedData(newRelatedData);
    } catch (err) {
      console.error('Error fetching related data:', err);
    } finally {
      setLoadingRelatedData(false);
    }
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
        if (!tableMetadata) return;
        
        // Need to create a clean copy of the formData without any type conversion issues
        const cleanData: Record<string, any> = {};
        for (const key in formData) {
          // Handle numeric fields
          if (typeof selectedRecord[key] === 'number') {
            // Try to convert to number if it's a numeric field
            const numValue = Number(formData[key]);
            cleanData[key] = isNaN(numValue) ? null : numValue;
          } 
          // Handle boolean fields
          else if (typeof selectedRecord[key] === 'boolean') {
            if (formData[key] === 'true') cleanData[key] = true;
            else if (formData[key] === 'false') cleanData[key] = false;
            else cleanData[key] = Boolean(formData[key]);
          }
          // Handle date fields
          else if (selectedRecord[key] instanceof Date) {
            cleanData[key] = new Date(formData[key]);
          }
          // Other types (string, etc.)
          else {
            cleanData[key] = formData[key];
          }
        }
        
        // Create where condition using primary keys (using parameterized queries on the server)
        const whereCondition = tableMetadata.primaryKeys
          .map(key => `[${key}] = '${selectedRecord[key]}'`)
          .join(' AND ');
        
        const response = await fetch(`/api/tables/${encodedTableName}/record`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: cleanData, whereCondition }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update record');
        }
      } else {
        // Create new record
        if (!tableMetadata) return;
        
        // We need to identify the correct types for each field
        // First, get column metadata to determine data types
        const cleanData: Record<string, any> = {};
        
        for (const column of tableMetadata.columns) {
          const value = formData[column.name];
          
          // Skip undefined values
          if (value === undefined) continue;
          
          // Convert value based on column data type
          const dataType = column.dataType.toLowerCase();
          
          if (value === null || value === '') {
            // Handle NULL values
            cleanData[column.name] = null;
          } else if (dataType.includes('int') || dataType.includes('decimal') || 
                    dataType.includes('numeric') || dataType.includes('float') || 
                    dataType.includes('real') || dataType.includes('money')) {
            // Handle numeric types
            const numValue = Number(value);
            cleanData[column.name] = isNaN(numValue) ? null : numValue;
          } else if (dataType.includes('bit') || dataType.includes('boolean')) {
            // Handle boolean types
            if (value === 'true') cleanData[column.name] = true;
            else if (value === 'false') cleanData[column.name] = false;
            else cleanData[column.name] = Boolean(value);
          } else if (dataType.includes('date') || dataType.includes('time')) {
            // Handle date types
            try {
              cleanData[column.name] = new Date(value).toISOString();
            } catch (e) {
              cleanData[column.name] = null;
            }
          } else {
            // Handle string and other types
            cleanData[column.name] = value;
          }
        }
        
        const response = await fetch(`/api/tables/${encodedTableName}/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create record');
        }
      }
      
      // Refresh table data
      if (selectedTable) {
        await fetchTableData(selectedTable, currentPage);
      }
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
    if (!selectedTable || !selectedRecord || !tableMetadata) return;
    
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Encode the table name properly for the URL
      const encodedTableName = encodeURIComponent(selectedTable);
      
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
      if (selectedTable) {
        await fetchTableData(selectedTable, currentPage);
      }
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the record');
      console.error('Error deleting record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    selectedRecord,
    formData,
    isEditing,
    isSaving,
    error,
    relatedData,
    loadingRelatedData,
    handleRecordSelect,
    handleNewRecord,
    handleFieldChange,
    isForeignKey,
    getDisplayField,
    handleSaveRecord,
    handleDeleteRecord,
    setIsEditing
  };
}