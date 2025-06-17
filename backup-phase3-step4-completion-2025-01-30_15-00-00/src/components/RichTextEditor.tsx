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

  // Suppress React warnings for ReactQuill and inject custom styles
  useEffect(() => {
    if (!cssLoaded) return; // Wait for CSS to load first

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Filter out known ReactQuill and Quill.js deprecation warnings
    console.error = (...args) => {
      const message = String(args[0]);
      if (
        message.includes('findDOMNode is deprecated') ||
        message.includes('DOMNodeInserted mutation event') ||
        message.includes('Listener added for a \'DOMNodeInserted\' mutation event') ||
        message.includes('Support for this event type has been removed')
      ) {
        return; // Suppress these specific warnings
      }
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = String(args[0]);
      if (
        message.includes('findDOMNode is deprecated') ||
        message.includes('DOMNodeInserted mutation event') ||
        message.includes('Listener added for a \'DOMNodeInserted\' mutation event') ||
        message.includes('Support for this event type has been removed')
      ) {
        return; // Suppress these specific warnings
      }
      originalConsoleWarn.apply(console, args);
    };

    // Also suppress console.log messages that might contain deprecation warnings
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = String(args[0]);
      if (
        message.includes('Deprecation') ||
        message.includes('DOMNodeInserted') ||
        message.includes('mutation event')
      ) {
        return; // Suppress these specific log messages
      }
      originalConsoleLog.apply(console, args);
    };

    // Patch addEventListener to prevent deprecated mutation events
    const originalAddEventListener = Element.prototype.addEventListener;
    Element.prototype.addEventListener = function(type: string, listener: any, options?: any) {
      // Block deprecated mutation events that Quill.js tries to use
      if (type === 'DOMNodeInserted' || type === 'DOMSubtreeModified' || type === 'DOMNodeRemoved') {
        console.debug(`Blocked deprecated mutation event: ${type}`);
        return; // Don't add the deprecated listener
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    // Inject custom CSS for Quill editor dark theme
    const style = document.createElement('style');
    style.textContent = `
      .ql-toolbar {
        background: rgba(55, 65, 81, 0.5) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-bottom: none !important;
        border-radius: 0.5rem 0.5rem 0 0 !important;
      }
      
      .ql-container {
        background: rgba(55, 65, 81, 0.5) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-top: none !important;
        border-radius: 0 0 0.5rem 0.5rem !important;
        color: white !important;
        min-height: 300px;
      }
      
      .ql-editor {
        color: white !important;
        font-size: 14px;
        line-height: 1.6;
      }
      
      .ql-editor.ql-blank::before {
        color: rgb(156, 163, 175) !important;
        font-style: italic;
      }
      
      .ql-toolbar .ql-stroke {
        stroke: rgb(156, 163, 175) !important;
      }
      
      .ql-toolbar .ql-fill {
        fill: rgb(156, 163, 175) !important;
      }
      
      .ql-toolbar .ql-picker-label {
        color: rgb(156, 163, 175) !important;
      }
      
      .ql-toolbar .ql-picker-options {
        background: rgb(55, 65, 81) !important;
        border: 1px solid rgb(75, 85, 99) !important;
      }
      
      .ql-toolbar .ql-picker-item {
        color: rgb(156, 163, 175) !important;
      }
      
      .ql-toolbar .ql-picker-item:hover {
        background: rgba(59, 130, 246, 0.1) !important;
        color: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button:hover {
        color: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button:hover .ql-stroke {
        stroke: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button:hover .ql-fill {
        fill: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button.ql-active {
        color: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button.ql-active .ql-stroke {
        stroke: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button.ql-active .ql-fill {
        fill: rgb(59, 130, 246) !important;
      }
      
      .ql-snow .ql-tooltip {
        background: rgb(55, 65, 81) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        color: white !important;
      }
      
      .ql-snow .ql-tooltip input {
        background: rgb(75, 85, 99) !important;
        border: 1px solid rgb(107, 114, 128) !important;
        color: white !important;
      }
      
      .ql-snow .ql-tooltip a {
        color: rgb(59, 130, 246) !important;
      }
    `;
    
    document.head.appendChild(style);
    setIsReady(true);

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
      Element.prototype.addEventListener = originalAddEventListener;
      document.head.removeChild(style);
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
    <div className={`quill-wrapper ${className || ''}`}>
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