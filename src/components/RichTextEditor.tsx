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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [cssLoaded, setCssLoaded] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [toolbarHeight, setToolbarHeight] = useState(0);

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

  // Handle sticky toolbar with JavaScript
  useEffect(() => {
    if (!isReady || !quillRef.current) return;

    const handleScroll = () => {
      const quillElement = quillRef.current?.getEditor()?.root?.parentElement?.parentElement;
      if (!quillElement) return;

      const toolbar = quillElement.querySelector('.ql-toolbar') as HTMLElement;
      if (!toolbar) return;

      const rect = quillElement.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();
      
      // Store toolbar height for spacing
      if (toolbarHeight === 0) {
        setToolbarHeight(toolbarRect.height);
      }

      // Check if the editor is in view and toolbar should be sticky
      const shouldBeSticky = rect.top <= 0 && rect.bottom > toolbarRect.height;
      
      if (shouldBeSticky !== isSticky) {
        setIsSticky(shouldBeSticky);
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isReady, isSticky, toolbarHeight]);

  // Apply sticky classes when state changes
  useEffect(() => {
    if (!isReady || !quillRef.current) return;

    const quillElement = quillRef.current?.getEditor()?.root?.parentElement?.parentElement;
    if (!quillElement) return;

    const toolbar = quillElement.querySelector('.ql-toolbar') as HTMLElement;
    const container = quillElement.querySelector('.ql-container') as HTMLElement;
    
    if (toolbar && container) {
      if (isSticky) {
        toolbar.classList.add('toolbar-sticky');
        container.classList.add('container-with-sticky-toolbar');
        // Add padding to prevent content jump
        container.style.paddingTop = `${toolbarHeight}px`;
      } else {
        toolbar.classList.remove('toolbar-sticky');
        container.classList.remove('container-with-sticky-toolbar');
        container.style.paddingTop = '0px';
      }
    }
  }, [isSticky, toolbarHeight, isReady]);

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
        background: rgba(55, 65, 81, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-bottom: none !important;
        border-radius: 0.5rem 0.5rem 0 0 !important;
        transition: all 0.2s ease-in-out !important;
        z-index: 1000 !important;
      }
      
      .ql-toolbar.toolbar-sticky {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        border-radius: 0 !important;
        z-index: 1000 !important;
      }
      
      .ql-container {
        background: rgba(55, 65, 81, 0.5) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-top: none !important;
        border-radius: 0 0 0.5rem 0.5rem !important;
        color: white !important;
        min-height: 300px;
      }
      
      .ql-container.container-with-sticky-toolbar {
        margin-top: 0 !important;
      }
      
      /* Ensure sticky toolbar works properly in different scroll contexts */
      .quill-wrapper {
        position: relative !important;
        z-index: 1 !important;
      }
      
      .quill-wrapper .ql-snow {
        border: none !important;
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
        z-index: 1001 !important;
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
        z-index: 1002 !important;
      }
      
      .ql-snow .ql-tooltip input {
        background: rgb(75, 85, 99) !important;
        border: 1px solid rgb(107, 114, 128) !important;
        color: white !important;
      }
      
      .ql-snow .ql-tooltip a {
        color: rgb(59, 130, 246) !important;
      }
      
      /* Enhanced mobile responsiveness for sticky toolbar */
      @media (max-width: 768px) {
        .ql-toolbar {
          padding: 8px 4px !important;
        }
        
        .ql-toolbar .ql-formats {
          margin-right: 8px !important;
        }
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