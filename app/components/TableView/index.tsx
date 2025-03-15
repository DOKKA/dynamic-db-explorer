import React, { useState } from 'react';
import { TableMetadata, SchemaResponse } from '../../types';
import { DataGrid } from './DataGrid';
import { Pagination } from './Pagination';
import { RecordForm } from './RecordForm';

interface TableViewProps {
  selectedTable: string;
  tableMetadata: TableMetadata;
  tableDataLoading: boolean;
  tableDataError: string | null;
  tableData: any;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  recordFormProps: any;
  schema: SchemaResponse | null;
  fetchTableData: (tableName: string, page?: number) => Promise<void>;
}

export function TableView({
  selectedTable,
  tableMetadata,
  tableDataLoading,
  tableDataError,
  tableData,
  currentPage,
  setCurrentPage,
  recordFormProps,
  schema,
  fetchTableData
}: TableViewProps) {
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Table header */}
      <div className="bg-gray-200 p-4 border-b border-gray-300">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{selectedTable}</h2>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={recordFormProps.handleNewRecord}
          >
            New Record
          </button>
        </div>
      </div>

      {/* Data grid */}
      <div className="flex-1 overflow-auto p-4">
        <DataGrid
          tableMetadata={tableMetadata}
          tableData={tableData}
          selectedRecord={recordFormProps.selectedRecord}
          onRecordSelect={recordFormProps.handleRecordSelect}
          loading={tableDataLoading}
          error={tableDataError}
        />

        {/* Pagination */}
        {tableData && tableData.total > 0 && (
          <Pagination
            currentPage={currentPage}
            totalRecords={tableData.total}
            pageSize={50}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Record form */}
      <RecordForm
        tableMetadata={tableMetadata}
        selectedRecord={recordFormProps.selectedRecord}
        formData={recordFormProps.formData}
        isEditing={recordFormProps.isEditing}
        isSaving={recordFormProps.isSaving}
        relatedData={recordFormProps.relatedData}
        loadingRelatedData={recordFormProps.loadingRelatedData}
        schema={schema}
        onFieldChange={recordFormProps.handleFieldChange}
        onSave={recordFormProps.handleSaveRecord}
        onDelete={recordFormProps.handleDeleteRecord}
        onCancel={() => recordFormProps.setIsEditing(false)}
        isForeignKey={recordFormProps.isForeignKey}
        getDisplayField={recordFormProps.getDisplayField}
        fetchTableData={fetchTableData}
      />
    </main>
  );
}