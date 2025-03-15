"use client";

import React from 'react';

interface ErrorStateProps {
  error: string;
  retry?: () => void;
}

export function ErrorState({ error, retry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
      <p className="text-center">{error}</p>
      {retry && (
        <button 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={retry}
        >
          Retry
        </button>
      )}
    </div>
  );
}