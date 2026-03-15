import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the page header', () => {
    render(<App />)
    expect(screen.getByText('Release Tracker')).toBeInTheDocument()
  })

  it('renders the empty state when no sections', () => {
    render(<App />)
    expect(screen.getByText(/no columns yet/i)).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<App />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })
})
