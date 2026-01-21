import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button, Header, ChartViewerPlaceholder } from './index'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>)
    const button = screen.getByText('Primary')
    expect(button.className).toContain('bg-blue-600')
  })

  it('applies secondary variant when specified', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByText('Secondary')
    expect(button.className).toContain('bg-gray-200')
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByText('Disabled')
    expect(button).toBeDisabled()
  })
})

describe('Header Component', () => {
  it('renders with default title', () => {
    render(<Header />)
    expect(screen.getByText('Organization Chart Generator')).toBeInTheDocument()
  })

  it('renders with custom title', () => {
    render(<Header title="Custom Title" />)
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })

  it('has proper header structure', () => {
    render(<Header />)
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    expect(header.className).toContain('bg-white')
  })
})

describe('ChartViewerPlaceholder Component', () => {
  it('renders placeholder content', () => {
    render(<ChartViewerPlaceholder />)
    expect(screen.getByText('Organization Chart Preview')).toBeInTheDocument()
    expect(screen.getByText('Your generated chart will appear here')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<ChartViewerPlaceholder className="custom-class" />)
    const placeholder = screen.getByText('Organization Chart Preview').parentElement
    expect(placeholder?.className).toContain('custom-class')
  })

  it('has proper dashed border styling', () => {
    render(<ChartViewerPlaceholder />)
    const placeholder = screen.getByText('Organization Chart Preview').parentElement
    expect(placeholder?.className).toContain('border-dashed')
  })
})