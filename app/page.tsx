'use client';

import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { TableView } from './components/TableView';
import { useSchema } from './hooks/useSchema';
import { useTableData } from './hooks/useTableData';
import { useRecordForm } from './hooks/useRecordForm';

export default function Home() {
  // State for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Use custom hooks
  const { 
    loading: schemaLoading, 
    error: schemaError, 
    schema, 
    selectedTable, 
    handleTableSelect,
    fetchSchema,
    getSelectedTableMetadata 
  } = useSchema();
  
  const {
    loading: tableDataLoading,
    error: tableDataError,
    tableData,
    fetchTableData
  } = useTableData(selectedTable, currentPage);
  
  const tableMetadata = getSelectedTableMetadata();
  
  const recordFormProps = useRecordForm(
    tableMetadata,
    selectedTable,
    fetchTableData,
    currentPage
  );

  // Render loading state for schema
  if (schemaLoading && !schema) {
    return <LoadingState message="Loading database schema..." />;
  }

  // Render error state for schema errors
  if (schemaError && !schema) {
    return <ErrorState error={schemaError} retry={fetchSchema} />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          schema={schema} 
          selectedTable={selectedTable} 
          onTableSelect={handleTableSelect}
        />

        {/* Main content area */}
        {selectedTable && tableMetadata ? (
          <TableView
            selectedTable={selectedTable}
            tableMetadata={tableMetadata}
            tableDataLoading={tableDataLoading}
            tableDataError={tableDataError}
            tableData={tableData}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            recordFormProps={recordFormProps}
            schema={schema}
            fetchTableData={fetchTableData}
          />
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-gray-500">Select a table from the sidebar to view data.</p>
          </div>
        )}
      </div>
    </div>
  );
}