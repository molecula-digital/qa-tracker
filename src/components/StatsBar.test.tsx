import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatsBar } from './StatsBar'

describe('StatsBar', () => {
  it('displays all four stat values', () => {
    render(<StatsBar total={10} passed={7} pending={3} sections={2} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows 70% for 7/10 passed', () => {
    render(<StatsBar total={10} passed={7} pending={3} sections={2} />)
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('shows 0% when total is 0', () => {
    render(<StatsBar total={0} passed={0} pending={0} sections={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
