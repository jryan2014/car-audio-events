import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus } from 'lucide-react';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { cannedResponseService } from '../../services/supabase-client';
import type { SupportCannedResponse } from '../../types';

const CannedResponsesManager: React.FC = () => {
  const [responses, setResponses] = useState<SupportCannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState<SupportCannedResponse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    try {
      const data = await cannedResponseService.getCannedResponses();
      setResponses(data);
    } catch (error) {
      console.error('Error loading canned responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingResponse) {
        await cannedResponseService.updateCannedResponse(editingResponse.id, {
          name: formData.name,
          content: formData.content,
          category: formData.category || null
        });
      } else {
        await cannedResponseService.createCannedResponse({
          name: formData.name,
          content: formData.content,
          category: formData.category || null,
          is_active: true
        });
      }

      setShowModal(false);
      setEditingResponse(null);
      setFormData({ name: '', content: '', category: '' });
      await loadResponses();
    } catch (error) {
      console.error('Error saving canned response:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (response: SupportCannedResponse) => {
    setEditingResponse(response);
    setFormData({
      name: response.name,
      content: response.content,
      category: response.category || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this canned response?')) return;

    try {
      await cannedResponseService.deleteCannedResponse(id);
      await loadResponses();
    } catch (error) {
      console.error('Error deleting canned response:', error);
    }
  };

  const handleNew = () => {
    setEditingResponse(null);
    setFormData({ name: '', content: '', category: '' });
    setShowModal(true);
  };

  // Group responses by category
  const responsesByCategory = responses.reduce((acc, response) => {
    const category = response.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(response);
    return acc;
  }, {} as Record<string, SupportCannedResponse[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Canned Responses
        </h2>
        <button
          onClick={handleNew}
          className="inline-flex items-center px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Response
        </button>
      </div>

      {responses.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No canned responses yet. Create your first one to speed up ticket replies!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(responsesByCategory).map(([category, categoryResponses]) => (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {category}
              </h3>
              <div className="space-y-3">
                {categoryResponses.map((response) => (
                  <div
                    key={response.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {response.name}
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {response.content}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(response)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(response.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingResponse ? 'Edit Canned Response' : 'New Canned Response'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="response-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  id="response-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  placeholder="e.g., Welcome Message"
                  required
                />
              </div>

              <div>
                <label htmlFor="response-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  id="response-category"
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  placeholder="e.g., General, Technical Support"
                />
              </div>

              <div>
                <label htmlFor="response-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content *
                </label>
                <textarea
                  id="response-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Type your response template..."
                  required
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingResponse(null);
                    setFormData({ name: '', content: '', category: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim() || !formData.content.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingResponse ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CannedResponsesManager;