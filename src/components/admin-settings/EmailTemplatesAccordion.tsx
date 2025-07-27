import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  email_type: string;
  membership_level?: string;
  is_active: boolean;
  from_name?: string;
  created_at: string;
  updated_at: string;
  category_id?: string;
}

interface EmailTemplateCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailTemplatesAccordionProps {
  templates: EmailTemplate[];
  categories: EmailTemplateCategory[];
  onSelectTemplate: (template: EmailTemplate) => void;
  selectedTemplateId?: string;
  searchQuery: string;
  categoryFilter: string;
}

export const EmailTemplatesAccordion: React.FC<EmailTemplatesAccordionProps> = ({
  templates,
  categories,
  onSelectTemplate,
  selectedTemplateId,
  searchQuery,
  categoryFilter
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [uncategorizedExpanded, setUncategorizedExpanded] = useState(true);

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const categoryId = template.category_id || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  // Filter templates
  const filterTemplates = (templateList: EmailTemplate[]) => {
    return templateList.filter(template => {
      // Search filter
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          template.name.toLowerCase().includes(searchLower) ||
          template.subject.toLowerCase().includes(searchLower) ||
          template.body.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      return true;
    });
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    if (categoryId === 'uncategorized') {
      setUncategorizedExpanded(!uncategorizedExpanded);
    } else {
      const newExpanded = new Set(expandedCategories);
      if (newExpanded.has(categoryId)) {
        newExpanded.delete(categoryId);
      } else {
        newExpanded.add(categoryId);
      }
      setExpandedCategories(newExpanded);
    }
  };

  // Sort categories by display order
  const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);

  // Handle template activation toggle
  const handleTemplateActivation = async (template: EmailTemplate, isActive: boolean) => {
    if (isActive) {
      // Deactivate all other templates with same name/category
      await supabase
        .from('email_templates')
        .update({ is_active: false })
        .eq('name', template.name)
        .eq('category_id', template.category_id)
        .neq('id', template.id);
    }
    
    // Update this template
    await supabase
      .from('email_templates')
      .update({ is_active: isActive })
      .eq('id', template.id);
  };

  const renderTemplateCard = (template: EmailTemplate) => {
    const isSelected = selectedTemplateId === template.id;
    
    return (
      <div
        key={template.id}
        className={`bg-gray-700/50 rounded-lg p-4 border transition-all cursor-pointer ${
          isSelected 
            ? 'border-electric-500 ring-2 ring-electric-500/20' 
            : 'border-gray-600 hover:border-electric-500/50'
        }`}
        onClick={() => onSelectTemplate(template)}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-white flex-1">{template.name}</h4>
          <div className="flex items-center space-x-2 ml-2">
            <span className={`text-xs px-2 py-1 rounded ${
              template.is_active 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {template.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{template.subject}</p>
        
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-xs">
            Updated: {new Date(template.updated_at).toLocaleDateString()}
          </p>
          
          <label className="flex items-center space-x-1 text-xs" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={template.is_active}
              onChange={(e) => handleTemplateActivation(template, e.target.checked)}
              className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
            />
          </label>
        </div>
      </div>
    );
  };

  const renderCategory = (categoryId: string, categoryName: string, categoryTemplates: EmailTemplate[]) => {
    const isExpanded = categoryId === 'uncategorized' ? uncategorizedExpanded : expandedCategories.has(categoryId);
    const filteredTemplates = filterTemplates(categoryTemplates);
    
    // Don't show category if no templates match the filter
    if (categoryFilter !== 'all' && categoryFilter !== categoryId) return null;
    if (filteredTemplates.length === 0 && searchQuery) return null;
    
    return (
      <div key={categoryId} className="mb-4">
        <button
          onClick={() => toggleCategory(categoryId)}
          className="w-full flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
            <FileText className="h-5 w-5 text-electric-400" />
            <span className="font-medium text-white">{categoryName}</span>
            <span className="text-sm text-gray-400">
              ({filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''})
            </span>
          </div>
          
          {filteredTemplates.some(t => t.is_active) && (
            <CheckCircle className="h-4 w-4 text-green-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-8">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map(renderTemplateCard)
            ) : (
              <p className="text-gray-500 text-sm col-span-full">
                No templates in this category
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Render categorized templates */}
      {sortedCategories.map(category => {
        const categoryTemplates = templatesByCategory[category.id] || [];
        if (categoryTemplates.length === 0 && !searchQuery) return null;
        
        return renderCategory(category.id, category.name, categoryTemplates);
      })}
      
      {/* Render uncategorized templates */}
      {templatesByCategory['uncategorized'] && (
        renderCategory('uncategorized', 'Uncategorized', templatesByCategory['uncategorized'])
      )}
    </div>
  );
};