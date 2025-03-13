import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ 
  currentPage, 
  totalRecords, 
  pageSize, 
  onPageChange 
}: PaginationProps) {
  if (totalRecords <= 0) {
    return null;
  }
  
  return (
    <div className="mt-4 flex justify-between items-center">
      <p>
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
      </p>
      <div className="flex space-x-2">
        <button
          className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        >
          Previous
        </button>
        <button
          className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
          disabled={currentPage * pageSize >= totalRecords}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}