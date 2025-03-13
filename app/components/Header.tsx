import React from 'react';

export function Header() {
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold">Dynamic DB Explorer</h1>
        <div className="flex items-center">
          <p className="text-sm">
            Connected to: {process.env.DB_NAME || 'Database'}
          </p>
        </div>
      </div>
    </header>
  );
}