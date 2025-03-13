import React, { useState, ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  icon?: React.ReactNode; // Optional icon for the tab
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  footerContent?: ReactNode; // Optional footer content that appears below all tabs
}

export function Tabs({ tabs, defaultTab, footerContent }: TabsProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs[0]?.id || '');

  return (
    <div className="w-full">
      {/* Tab navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <nav className="flex flex-wrap -mb-px px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`py-3 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-4 bg-white">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>

      {/* Footer content */}
      {footerContent && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {footerContent}
        </div>
      )}
    </div>
  );
}