import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CommentInput from '../CommentInput'

describe('CommentInput', () => {
  const mockOnStartProcess = jest.fn()

  beforeEach(() => {
    mockOnStartProcess.mockClear()
  })

  it('renders correctly', () => {
    render(
      <CommentInput 
        onStartProcess={mockOnStartProcess}
        isProcessing={false}
        videoUrl=""
      />
    )

    expect(screen.getByPlaceholderText(/粘贴YouTube视频链接/)).toBeInTheDocument()
    expect(screen.getByText('开始采集评论')).toBeInTheDocument()
  })

  it('validates YouTube URL input', async () => {
    render(
      <CommentInput 
        onStartProcess={mockOnStartProcess}
        isProcessing={false}
        videoUrl=""
      />
    )

    const input = screen.getByPlaceholderText(/粘贴YouTube视频链接/)
    const submitButton = screen.getByText('开始采集评论')

    // Enter invalid URL
    fireEvent.change(input, { target: { value: 'invalid-url' } })
    
    await waitFor(() => {
      expect(screen.getByText('请输入有效的YouTube视频链接')).toBeInTheDocument()
    })

    expect(submitButton).toBeDisabled()
  })

  it('accepts valid YouTube URL', async () => {
    render(
      <CommentInput 
        onStartProcess={mockOnStartProcess}
        isProcessing={false}
        videoUrl=""
      />
    )

    const input = screen.getByPlaceholderText(/粘贴YouTube视频链接/)
    const submitButton = screen.getByText('开始采集评论')

    // Enter valid URL
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('calls onStartProcess when form is submitted with valid URL', async () => {
    render(
      <CommentInput 
        onStartProcess={mockOnStartProcess}
        isProcessing={false}
        videoUrl=""
      />
    )

    const input = screen.getByPlaceholderText(/粘贴YouTube视频链接/)
    const form = input.closest('form')

    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockOnStartProcess).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    })
  })

  it('disables input and button when processing', () => {
    render(
      <CommentInput 
        onStartProcess={mockOnStartProcess}
        isProcessing={true}
        videoUrl="https://www.youtube.com/watch?v=test"
      />
    )

    const input = screen.getByPlaceholderText(/粘贴YouTube视频链接/)
    const submitButton = screen.getByText('处理中...')

    expect(input).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('shows paste button and handles paste action', async () => {
    render(
      <CommentInput 
        onStartProcess={mockOnStartProcess}
        isProcessing={false}
        videoUrl=""
      />
    )

    const pasteButton = screen.getByText('粘贴')
    fireEvent.click(pasteButton)

    await waitFor(() => {
      const input = screen.getByDisplayValue('https://www.youtube.com/watch?v=test')
      expect(input).toBeInTheDocument()
    })
  })

  it('shows clear button when input has value', () => {
    render(
      <CommentInput 
        onStartProcess={mockOnStartProcess}
        isProcessing={false}
        videoUrl=""
      />
    )

    const input = screen.getByPlaceholderText(/粘贴YouTube视频链接/)
    fireEvent.change(input, { target: { value: 'some text' } })

    expect(screen.getByText('清空')).toBeInTheDocument()
  })
})