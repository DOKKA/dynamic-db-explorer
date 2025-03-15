"use client";

import { useState, useEffect } from 'react';
import { SchemaResponse } from '../types';

export function useSchema() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Fetch database schema on hook initialization
  useEffect(() => {
    fetchSchema();
  }, []);

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

  // Get selected table metadata
  const getSelectedTableMetadata = () => {
    if (!schema || !selectedTable) return null;
    return schema.tables.find(table => table.name === selectedTable) || null;
  };

  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  return {
    loading,
    error,
    schema,
    selectedTable,
    setSelectedTable,
    fetchSchema,
    getSelectedTableMetadata,
    handleTableSelect
  };
}