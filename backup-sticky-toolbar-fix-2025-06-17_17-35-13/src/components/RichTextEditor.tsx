import React, { useRef, useEffect, useState } from 'react';
import ReactQuill from 'react-quill';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const [isReady, setIsReady] = useState(false);
  const [cssLoaded, setCssLoaded] = useState(false);

  // Dynamically load Quill CSS only when component is used
  useEffect(() => {
    const loadQuillCSS = async () => {
      if (!cssLoaded) {
        try {
          await import('react-quill/dist/quill.snow.css');
          setCssLoaded(true);
        } catch (error) {
          console.error('Failed to load Quill CSS:', error);
        }
      }
    };

    loadQuillCSS();
  }, [cssLoaded]);

  // Inject custom CSS for Quill editor with sticky toolbar
  useEffect(() => {
    if (!cssLoaded) return;

    const style = document.createElement('style');
    style.id = 'quill-sticky-toolbar-styles';
    style.textContent = `
      /* Make the toolbar sticky */
      .sticky-toolbar-editor .ql-toolbar {
        position: sticky !important;
        top: 0 !important;
        z-index: 1000 !important;
        background: rgba(55, 65, 81, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-bottom: none !important;
        border-radius: 0.5rem 0.5rem 0 0 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
      }
      
      .sticky-toolbar-editor .ql-container {
        background: rgba(55, 65, 81, 0.5) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-top: none !important;
        border-radius: 0 0 0.5rem 0.5rem !important;
        color: white !important;
        min-height: 300px;
      }
      
      .sticky-toolbar-editor .ql-editor {
        color: white !important;
        font-size: 14px;
        line-height: 1.6;
      }
      
      .sticky-toolbar-editor .ql-editor.ql-blank::before {
        color: rgb(156, 163, 175) !important;
        font-style: italic;
      }
      
      .sticky-toolbar-editor .ql-toolbar .ql-stroke {
        stroke: rgb(156, 163, 175) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar .ql-fill {
        fill: rgb(156, 163, 175) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar .ql-picker-label {
        color: rgb(156, 163, 175) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar .ql-picker-options {
        background: rgb(55, 65, 81) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        z-index: 1001 !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar .ql-picker-item {
        color: rgb(156, 163, 175) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar .ql-picker-item:hover {
        background: rgba(59, 130, 246, 0.1) !important;
        color: rgb(59, 130, 246) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar button:hover {
        color: rgb(59, 130, 246) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar button:hover .ql-stroke {
        stroke: rgb(59, 130, 246) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar button:hover .ql-fill {
        fill: rgb(59, 130, 246) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar button.ql-active {
        color: rgb(59, 130, 246) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar button.ql-active .ql-stroke {
        stroke: rgb(59, 130, 246) !important;
      }
      
      .sticky-toolbar-editor .ql-toolbar button.ql-active .ql-fill {
        fill: rgb(59, 130, 246) !important;
      }
      
      .sticky-toolbar-editor .ql-snow .ql-tooltip {
        background: rgb(55, 65, 81) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        color: white !important;
        z-index: 1002 !important;
      }
      
      .sticky-toolbar-editor .ql-snow .ql-tooltip input {
        background: rgb(75, 85, 99) !important;
        border: 1px solid rgb(107, 114, 128) !important;
        color: white !important;
      }
      
      .sticky-toolbar-editor .ql-snow .ql-tooltip a {
        color: rgb(59, 130, 246) !important;
      }
    `;
    
    document.head.appendChild(style);
    setIsReady(true);

    return () => {
      const existingStyle = document.getElementById('quill-sticky-toolbar-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, [cssLoaded]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'indent',
    'align', 'link', 'image', 'video', 'blockquote', 'code-block'
  ];

  if (!isReady) {
    return (
      <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 text-gray-400">
        Loading editor...
      </div>
    );
  }

  return (
    <div className={`quill-wrapper sticky-toolbar-editor ${className || ''}`}>
      <ReactQuill
        ref={quillRef}
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || "Start writing..."}
        theme="snow"
        style={{
          backgroundColor: 'rgba(55, 65, 81, 0.5)',
          borderRadius: '0.5rem',
          border: '1px solid rgb(75, 85, 99)'
        }}
      />
    </div>
  );
} 