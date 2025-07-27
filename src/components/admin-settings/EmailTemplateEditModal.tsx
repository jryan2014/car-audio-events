import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Eye, Code, FileText, Copy, HelpCircle } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { getTinyMCEScriptUrl } from '../../config/tinymce';
// Email variables will be passed as props or defined inline

interface EmailVariable {
  name: string;
  description: string;
  example: string;
  category: 'system' | 'user' | 'event' | 'organization' | 'billing' | 'invoice' | 'competition' | 'notification';
}

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

interface EmailTemplateEditModalProps {
  template: EmailTemplate | null;
  categories: any[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: EmailTemplate) => Promise<void>;
  onDelete?: (templateId: string) => Promise<void>;
}

export const EmailTemplateEditModal: React.FC<EmailTemplateEditModalProps> = ({
  template,
  categories,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [selectedVariableCategory, setSelectedVariableCategory] = useState('all');
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (template) {
      setEditedTemplate({ ...template });
    }
  }, [template]);

  if (!isOpen || !editedTemplate) return null;

  const handleSave = async () => {
    if (!editedTemplate) return;
    
    setIsSaving(true);
    try {
      // Get content from TinyMCE if in rich text mode
      if (editorRef.current) {
        editedTemplate.body = editorRef.current.getContent();
      }
      
      await onSave(editedTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editedTemplate?.id || !onDelete) return;
    
    if (confirm('Are you sure you want to delete this template?')) {
      await onDelete(editedTemplate.id);
      onClose();
    }
  };

  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(`{{${variable}}}`);
    } else {
      // For plain text mode
      const textarea = document.getElementById('template-body-textarea') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        textarea.value = before + `{{${variable}}}` + after;
        textarea.selectionStart = start + variable.length + 4;
        textarea.selectionEnd = start + variable.length + 4;
        setEditedTemplate({ ...editedTemplate, body: textarea.value });
      }
    }
  };

  // Sample email variables - in a real app, these would come from props or a shared config
  const EMAIL_VARIABLES: EmailVariable[] = [
    { name: 'user_name', description: 'User\'s full name', example: 'John Doe', category: 'user' },
    { name: 'user_email', description: 'User\'s email address', example: 'john@example.com', category: 'user' },
    { name: 'event_name', description: 'Event name', example: 'Summer Car Show 2024', category: 'event' },
    { name: 'event_date', description: 'Event date', example: 'July 15, 2024', category: 'event' },
    { name: 'organization_name', description: 'Organization name', example: 'Car Audio Events', category: 'organization' },
    { name: 'payment_amount', description: 'Payment amount', example: '$99.99', category: 'billing' },
  ];

  const getAllCategories = () => {
    const categories = new Set(EMAIL_VARIABLES.map(v => v.category));
    return Array.from(categories);
  };

  const getVariablesByCategory = (category: string) => {
    return EMAIL_VARIABLES.filter(v => v.category === category);
  };

  const filteredVariables = selectedVariableCategory === 'all' 
    ? EMAIL_VARIABLES 
    : getVariablesByCategory(selectedVariableCategory);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-900/75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-6xl text-left align-bottom bg-gray-800 rounded-lg shadow-xl transform transition-all sm:my-8 sm:align-middle">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h3 className="text-xl font-semibold text-white">
              {editedTemplate.id ? 'Edit Email Template' : 'Create New Template'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Template Details */}
              <div className="lg:col-span-2 space-y-4">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={editedTemplate.name}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={editedTemplate.category_id || ''}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, category_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={editedTemplate.subject}
                    onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-electric-500 focus:border-transparent"
                  />
                </div>

                {/* Body Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Email Body
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-1"
                      >
                        {isPreviewMode ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span>{isPreviewMode ? 'Edit' : 'Preview'}</span>
                      </button>
                    </div>
                  </div>

                  {isPreviewMode ? (
                    <div className="bg-white rounded-lg p-6 min-h-[400px]">
                      <div dangerouslySetInnerHTML={{ __html: editedTemplate.body }} />
                    </div>
                  ) : (
                    <div className="border border-gray-600 rounded-lg overflow-hidden">
                      <Editor
                        tinymceScriptSrc={getTinyMCEScriptUrl()}
                        onInit={(evt, editor) => editorRef.current = editor}
                        value={editedTemplate.body}
                        onEditorChange={(content) => setEditedTemplate({ ...editedTemplate, body: content })}
                        init={{
                          height: 400,
                          menubar: true,
                          plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                          ],
                          toolbar: 'undo redo | formatselect | bold italic underline strikethrough | ' +
                            'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
                            'bullist numlist outdent indent | link image media table | ' +
                            'removeformat | fullscreen preview | help',
                          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right column - Variables */}
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white flex items-center">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Available Variables
                    </h4>
                    <button
                      onClick={() => setShowVariables(!showVariables)}
                      className="text-sm text-electric-400 hover:text-electric-300"
                    >
                      {showVariables ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {showVariables && (
                    <>
                      <select
                        value={selectedVariableCategory}
                        onChange={(e) => setSelectedVariableCategory(e.target.value)}
                        className="w-full px-3 py-2 mb-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                      >
                        <option value="all">All Categories</option>
                        {getAllCategories().map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>

                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredVariables.map((variable) => (
                          <div
                            key={variable.name}
                            className="p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer transition-colors"
                            onClick={() => insertVariable(variable.name)}
                          >
                            <div className="flex items-center justify-between">
                              <code className="text-xs text-electric-400">
                                {`{{${variable.name}}}`}
                              </code>
                              <Copy className="h-3 w-3 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {variable.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700">
            <div>
              {editedTemplate.id && onDelete && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  Delete Template
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-electric-600 text-white rounded-lg hover:bg-electric-500 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};