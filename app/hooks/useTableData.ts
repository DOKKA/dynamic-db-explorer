import { useState, useEffect } from 'react';
import { TableDataResponse } from '../types';

export function useTableData(selectedTable: string | null, currentPage: number) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  
  // Fetch table data when selected table changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, currentPage);
    }
  }, [selectedTable, currentPage]);

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
    } catch (err: any) {
      setError(err.message || `An error occurred while fetching data for table ${tableName}`);
      console.error(`Error fetching data for table ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, tableData, fetchTableData };
}