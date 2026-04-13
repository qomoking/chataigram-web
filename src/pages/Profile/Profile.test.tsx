/**
 * L3: Profile（本地编辑页）。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Profile from './Profile'
import { wrapWithProviders } from '../../test-utils/wrapper'

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/profile/edit']}>
      <Routes>
        <Route path="/profile/edit" element={<Profile />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: wrapWithProviders() },
  )
}

describe('<Profile> L3', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders default profile', () => {
    renderAt()
    expect(screen.getByText('Profile')).toBeTruthy()
    expect(screen.getByText('You')).toBeTruthy()
  })

  it('edits and saves display name to localStorage', async () => {
    renderAt()
    // 默认展示模式，点名字进入编辑
    fireEvent.click(screen.getByText('You'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByText('Saved!')).toBeTruthy())
    const stored = JSON.parse(localStorage.getItem('omnient_profile')!)
    expect(stored.name).toBe('Alice')
  })
})
