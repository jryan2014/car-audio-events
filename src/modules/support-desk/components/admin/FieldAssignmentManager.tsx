import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import type { SupportRequestType, SupportFieldDefinition } from '../../types';

interface FieldAssignment {
  id: string;
  request_type_id: string;
  field_definition_id: string;
  is_required: boolean;
  sort_order: number;
}

interface FieldDependency {
  id: string;
  dependent_field_id: string;
  parent_field_id: string;
  parent_field_value?: string;
  parent_field_values?: any[];
  condition_type: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in';
}

const FieldAssignmentManager: React.FC = () => {
  const [requestTypes, setRequestTypes] = useState<SupportRequestType[]>([]);
  const [fields, setFields] = useState<SupportFieldDefinition[]>([]);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [dependencies, setDependencies] = useState<FieldDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [editingDependency, setEditingDependency] = useState<Partial<FieldDependency>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRequestType) {
      loadAssignments();
    }
  }, [selectedRequestType]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load request types
      const { data: typesData } = await supabase
        .from('support_request_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      // Load fields
      const { data: fieldsData } = await supabase
        .from('support_field_definitions')
        .select('*')
        .eq('is_active', true)
        .order('label');
      
      // Load all dependencies
      const { data: depsData } = await supabase
        .from('support_field_dependencies')
        .select('*')
        .eq('is_active', true);
      
      setRequestTypes(typesData || []);
      setFields(fieldsData || []);
      setDependencies(depsData || []);
      
      if (typesData && typesData.length > 0) {
        setSelectedRequestType(typesData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const { data } = await supabase
        .from('support_request_type_fields')
        .select('*')
        .eq('request_type_id', selectedRequestType)
        .order('sort_order');
      
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleAssignField = async (fieldId: string) => {
    try {
      const maxSortOrder = Math.max(...assignments.map(a => a.sort_order), -1);
      
      const { error } = await supabase
        .from('support_request_type_fields')
        .insert({
          request_type_id: selectedRequestType,
          field_definition_id: fieldId,
          is_required: false,
          sort_order: maxSortOrder + 1
        });
      
      if (error) throw error;
      
      await loadAssignments();
    } catch (error) {
      console.error('Error assigning field:', error);
      alert('Failed to assign field');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this field from the request type?')) return;
    
    try {
      const { error } = await supabase
        .from('support_request_type_fields')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      await loadAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('Failed to remove field');
    }
  };

  const handleToggleRequired = async (assignmentId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('support_request_type_fields')
        .update({ is_required: !currentValue })
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      await loadAssignments();
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  const handleUpdateSortOrder = async (assignmentId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('support_request_type_fields')
        .update({ sort_order: newOrder })
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      await loadAssignments();
    } catch (error) {
      console.error('Error updating sort order:', error);
    }
  };

  const handleAddDependency = (fieldId: string) => {
    setEditingDependency({
      dependent_field_id: fieldId,
      condition_type: 'equals'
    });
    setShowDependencyModal(true);
  };

  const handleSaveDependency = async () => {
    try {
      if (!editingDependency.parent_field_id || !editingDependency.condition_type) {
        alert('Please select a parent field and condition');
        return;
      }

      if (editingDependency.id) {
        // Update existing
        const { error } = await supabase
          .from('support_field_dependencies')
          .update({
            parent_field_id: editingDependency.parent_field_id,
            parent_field_value: editingDependency.parent_field_value,
            parent_field_values: editingDependency.parent_field_values,
            condition_type: editingDependency.condition_type
          })
          .eq('id', editingDependency.id);
        
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('support_field_dependencies')
          .insert({
            dependent_field_id: editingDependency.dependent_field_id,
            parent_field_id: editingDependency.parent_field_id,
            parent_field_value: editingDependency.parent_field_value,
            parent_field_values: editingDependency.parent_field_values,
            condition_type: editingDependency.condition_type
          });
        
        if (error) throw error;
      }

      setShowDependencyModal(false);
      setEditingDependency({});
      await loadData();
    } catch (error) {
      console.error('Error saving dependency:', error);
      alert('Failed to save dependency');
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    if (!confirm('Delete this dependency?')) return;
    
    try {
      const { error } = await supabase
        .from('support_field_dependencies')
        .delete()
        .eq('id', dependencyId);
      
      if (error) throw error;
      
      await loadData();
    } catch (error) {
      console.error('Error deleting dependency:', error);
      alert('Failed to delete dependency');
    }
  };

  const getFieldById = (fieldId: string) => fields.find(f => f.id === fieldId);
  const getAssignedFieldIds = () => assignments.map(a => a.field_definition_id);
  const getUnassignedFields = () => fields.filter(f => !getAssignedFieldIds().includes(f.id));
  const getFieldDependencies = (fieldId: string) => dependencies.filter(d => d.dependent_field_id === fieldId);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Field Assignment & Dependencies</h3>
        
        {/* Request Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Request Type
          </label>
          <select
            value={selectedRequestType}
            onChange={(e) => setSelectedRequestType(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
          >
            {requestTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        {selectedRequestType && (
          <>
            {/* Assigned Fields */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-white mb-3">Assigned Fields</h4>
              <div className="space-y-2">
                {assignments.length === 0 ? (
                  <p className="text-gray-400 text-sm">No fields assigned to this request type</p>
                ) : (
                  assignments.map((assignment, index) => {
                    const field = getFieldById(assignment.field_definition_id);
                    if (!field) return null;
                    
                    const fieldDeps = getFieldDependencies(field.id);
                    const isExpanded = expandedField === field.id;
                    
                    return (
                      <div key={assignment.id} className="bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => setExpandedField(isExpanded ? null : field.id)}
                              className="text-gray-400 hover:text-white"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            <input
                              type="number"
                              value={assignment.sort_order}
                              onChange={(e) => handleUpdateSortOrder(assignment.id, parseInt(e.target.value))}
                              className="w-16 px-2 py-1 rounded bg-gray-600 text-white text-sm"
                              title="Sort order"
                            />
                            <span className="text-white font-medium">{field.label}</span>
                            <span className="text-gray-400 text-sm">({field.field_type})</span>
                            {fieldDeps.length > 0 && (
                              <span className="text-electric-400 text-xs flex items-center">
                                <Link2 className="h-3 w-3 mr-1" />
                                Has dependencies
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={assignment.is_required}
                                onChange={() => handleToggleRequired(assignment.id, assignment.is_required)}
                                className="mr-2 rounded border-gray-300"
                              />
                              <span className="text-gray-300">Required</span>
                            </label>
                            <button
                              onClick={() => handleAddDependency(field.id)}
                              className="p-1 text-blue-400 hover:text-blue-300"
                              title="Add dependency"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveAssignment(assignment.id)}
                              className="p-1 text-red-400 hover:text-red-300"
                              title="Remove field"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Field Dependencies */}
                        {isExpanded && (
                          <div className="mt-3 pl-10 space-y-2">
                            {fieldDeps.length === 0 ? (
                              <p className="text-gray-400 text-sm">No dependencies configured</p>
                            ) : (
                              fieldDeps.map(dep => {
                                const parentField = getFieldById(dep.parent_field_id);
                                return (
                                  <div key={dep.id} className="bg-gray-600/50 rounded p-2 flex items-center justify-between">
                                    <div className="text-sm">
                                      <span className="text-gray-300">Show when </span>
                                      <span className="text-white font-medium">{parentField?.label}</span>
                                      <span className="text-gray-300"> {dep.condition_type} </span>
                                      <span className="text-electric-400">
                                        {dep.parent_field_values ? 
                                          JSON.stringify(dep.parent_field_values) : 
                                          dep.parent_field_value || 'any value'}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteDependency(dep.id)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                            <button
                              onClick={() => handleAddDependency(field.id)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              + Add dependency rule
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Available Fields */}
            <div>
              <h4 className="text-md font-medium text-white mb-3">Available Fields</h4>
              <div className="grid grid-cols-2 gap-2">
                {getUnassignedFields().map(field => (
                  <div
                    key={field.id}
                    className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-white">{field.label}</span>
                      <span className="text-gray-400 text-sm ml-2">({field.field_type})</span>
                    </div>
                    <button
                      onClick={() => handleAssignField(field.id)}
                      className="text-green-400 hover:text-green-300"
                      title="Assign to request type"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {getUnassignedFields().length === 0 && (
                  <p className="text-gray-400 text-sm col-span-2">All fields are assigned</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dependency Modal */}
      {showDependencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Configure Field Dependency</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Parent Field (Show dependent field when...)
                </label>
                <select
                  value={editingDependency.parent_field_id || ''}
                  onChange={(e) => setEditingDependency({
                    ...editingDependency,
                    parent_field_id: e.target.value
                  })}
                  className="w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white"
                >
                  <option value="">Select parent field</option>
                  {assignments.map(a => {
                    const field = getFieldById(a.field_definition_id);
                    if (!field || field.id === editingDependency.dependent_field_id) return null;
                    return (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Condition Type
                </label>
                <select
                  value={editingDependency.condition_type || 'equals'}
                  onChange={(e) => setEditingDependency({
                    ...editingDependency,
                    condition_type: e.target.value as any
                  })}
                  className="w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="in">In List</option>
                  <option value="not_in">Not In List</option>
                </select>
              </div>

              {editingDependency.parent_field_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Value(s)
                  </label>
                  {(() => {
                    const parentField = getFieldById(editingDependency.parent_field_id);
                    if ((parentField?.field_type === 'dropdown_static' || parentField?.field_type === 'dropdown_dynamic_event') && parentField.options) {
                      // For dropdown fields, show the options
                      const options = Array.isArray(parentField.options) ? 
                        parentField.options : 
                        (parentField.options as any).options || [];
                      
                      if (editingDependency.condition_type === 'in' || editingDependency.condition_type === 'not_in') {
                        // Multiple select for in/not_in conditions
                        return (
                          <select
                            multiple
                            value={editingDependency.parent_field_values || []}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, option => option.value);
                              setEditingDependency({
                                ...editingDependency,
                                parent_field_values: selected,
                                parent_field_value: undefined
                              });
                            }}
                            className="w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white"
                            size={4}
                          >
                            {options.map((opt: any) => (
                              <option key={opt.value || opt} value={opt.value || opt}>
                                {opt.label || opt}
                              </option>
                            ))}
                          </select>
                        );
                      } else {
                        // Single select for other conditions
                        return (
                          <select
                            value={editingDependency.parent_field_value || ''}
                            onChange={(e) => setEditingDependency({
                              ...editingDependency,
                              parent_field_value: e.target.value,
                              parent_field_values: undefined
                            })}
                            className="w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white"
                          >
                            <option value="">Any value</option>
                            {options.map((opt: any) => (
                              <option key={opt.value || opt} value={opt.value || opt}>
                                {opt.label || opt}
                              </option>
                            ))}
                          </select>
                        );
                      }
                    } else {
                      // For other field types, show a text input
                      return (
                        <input
                          type="text"
                          value={editingDependency.parent_field_value || ''}
                          onChange={(e) => setEditingDependency({
                            ...editingDependency,
                            parent_field_value: e.target.value,
                            parent_field_values: undefined
                          })}
                          placeholder="Enter value to match"
                          className="w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white"
                        />
                      );
                    }
                  })()}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDependencyModal(false);
                  setEditingDependency({});
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDependency}
                className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600"
              >
                Save Dependency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldAssignmentManager;