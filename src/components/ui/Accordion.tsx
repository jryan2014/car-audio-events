import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AccordionItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
}

export default function Accordion({ items, allowMultiple = true, className = '' }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(items.filter(item => item.defaultOpen).map(item => item.id))
  );

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(itemId);
      }
      
      return newSet;
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        
        return (
          <div
            key={item.id}
            className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden transition-all duration-200"
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {item.icon && (
                  <div className="text-electric-500">
                    {item.icon}
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              </div>
              
              <div className="text-gray-400">
                {isOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </button>
            
            <div
              className={`transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              } overflow-hidden`}
            >
              <div className="px-6 pb-6">
                <div className="border-t border-gray-700/50 pt-6">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}