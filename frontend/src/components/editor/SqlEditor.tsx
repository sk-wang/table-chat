import React, { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

// Infer editor type from OnMount callback parameters
type EditorInstance = Parameters<OnMount>[0];

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  onFormat?: () => void;
  readOnly?: boolean;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  onExecute,
  onFormat,
  readOnly = false,
}) => {
  const editorRef = useRef<EditorInstance | null>(null);

  const handleEditorDidMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;

    // Add Ctrl+Enter / Cmd+Enter keyboard shortcut for execution
    if (onExecute) {
      editorInstance.addCommand(
         
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
        () => {
          onExecute();
        }
      );
    }

    // Add Shift+Alt+F keyboard shortcut for formatting
    if (onFormat) {
      editorInstance.addCommand(
         
        monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyF,
        () => {
          onFormat();
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
