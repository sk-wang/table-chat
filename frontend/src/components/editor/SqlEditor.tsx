import React, { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  readOnly?: boolean;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  onExecute,
  readOnly = false,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;

    // Add Ctrl+Enter / Cmd+Enter keyboard shortcut
    if (onExecute) {
      editorInstance.addCommand(
        // eslint-disable-next-line no-bitwise
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
        () => {
          onExecute();
        }
      );
    }

    // Focus editor
    editorInstance.focus();
  };

  return (
    <div className="monaco-editor-container" style={{ height: '300px' }}>
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={val => onChange(val || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};
