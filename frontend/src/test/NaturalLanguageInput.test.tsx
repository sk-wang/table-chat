import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NaturalLanguageInput } from '../components/editor/NaturalLanguageInput';

describe('NaturalLanguageInput', () => {
  const defaultProps = {
    onGenerate: vi.fn(),
    loading: false,
    disabled: false,
    llmUnavailable: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the text area and generate button', () => {
    render(<NaturalLanguageInput {...defaultProps} />);
    
    // Match actual placeholder text
    expect(screen.getByPlaceholderText(/例如：查询所有年龄大于18岁的用户/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /生成 SQL/i })).toBeInTheDocument();
  });

  it('should update text area value on input', () => {
    render(<NaturalLanguageInput {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/例如：查询所有年龄大于18岁的用户/);
    fireEvent.change(textarea, { target: { value: '查询所有用户' } });
    
    expect(textarea).toHaveValue('查询所有用户');
  });

  it('should call onGenerate when generate button is clicked', async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(<NaturalLanguageInput {...defaultProps} onGenerate={onGenerate} />);
    
    const textarea = screen.getByPlaceholderText(/例如：查询所有年龄大于18岁的用户/);
    fireEvent.change(textarea, { target: { value: '查询所有用户' } });
    
    const generateButton = screen.getByRole('button', { name: /生成 SQL/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith('查询所有用户');
    });
  });

  it('should not call onGenerate when prompt is empty', async () => {
    const onGenerate = vi.fn();
    render(<NaturalLanguageInput {...defaultProps} onGenerate={onGenerate} />);
    
    const generateButton = screen.getByRole('button', { name: /生成 SQL/i });
    fireEvent.click(generateButton);
    
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('should disable the generate button when loading', () => {
    render(<NaturalLanguageInput {...defaultProps} loading />);
    
    const generateButton = screen.getByRole('button', { name: /生成 SQL/i });
    expect(generateButton).toBeDisabled();
  });

  it('should disable the generate button when disabled prop is true', () => {
    render(<NaturalLanguageInput {...defaultProps} disabled />);
    
    const generateButton = screen.getByRole('button', { name: /生成 SQL/i });
    expect(generateButton).toBeDisabled();
  });

  it('should show LLM unavailable alert when llmUnavailable is true', () => {
    render(<NaturalLanguageInput {...defaultProps} llmUnavailable />);
    
    expect(screen.getByText(/AI 功能不可用/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/例如：查询所有年龄大于18岁的用户/)).not.toBeInTheDocument();
  });

  it('should show loading state on button when generating', () => {
    render(<NaturalLanguageInput {...defaultProps} loading />);
    
    // The button should be disabled when loading (Ant Design handles loading indicator internally)
    const generateButton = screen.getByRole('button', { name: /生成 SQL/i });
    expect(generateButton).toBeDisabled();
  });

  it('should trim whitespace from prompt before generating', async () => {
    const onGenerate = vi.fn().mockResolvedValue(undefined);
    render(<NaturalLanguageInput {...defaultProps} onGenerate={onGenerate} />);
    
    const textarea = screen.getByPlaceholderText(/例如：查询所有年龄大于18岁的用户/);
    fireEvent.change(textarea, { target: { value: '  查询所有用户  ' } });
    
    const generateButton = screen.getByRole('button', { name: /生成 SQL/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith('查询所有用户');
    });
  });
});

