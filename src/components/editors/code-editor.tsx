'use client';

import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';

type MonacoEditor = Parameters<OnMount>[0];

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: 'python' | 'typescript' | 'javascript' | 'json';
  readOnly?: boolean;
  height?: string | number;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  height = '400px',
  className,
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null);

  const handleEditorDidMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      if (onChange && val !== undefined) {
        onChange(val);
      }
    },
    [onChange],
  );

  return (
    <div className={className}>
      <Editor
        height={height}
        language={language}
        value={value}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}
