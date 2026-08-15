import { describe, expect, it } from 'vitest'
import { principalFromSession, principalFromUser } from '../src/principal.ts'

describe('principalFromUser', () => {
  it('returns undefined for an empty user id', () => {
    expect(principalFromUser({ id: '', name: 'Ada' })).toBeUndefined()
  })

  it('omits a missing, null, or empty image', () => {
    expect(principalFromUser({ id: 'u', name: 'Ada' })).toEqual({ id: 'u', name: 'Ada' })
    expect(principalFromUser({ id: 'u', name: 'Ada', image: null })).toEqual({ id: 'u', name: 'Ada' })
    expect(principalFromUser({ id: 'u', name: 'Ada', image: '' })).toEqual({ id: 'u', name: 'Ada' })
  })

  it('keeps a non-empty image URL', () => {
    expect(principalFromUser({ id: 'u', name: 'Ada', image: 'https://avatars.example/a.png' }))
      .toEqual({ id: 'u', name: 'Ada', image: 'https://avatars.example/a.png' })
  })
})

describe('principalFromSession', () => {
  it('returns undefined without a session user', () => {
    expect(principalFromSession(undefined)).toBeUndefined()
    expect(principalFromSession(null)).toBeUndefined()
    expect(principalFromSession({})).toBeUndefined()
  })

  it('maps a session user', () => {
    expect(principalFromSession({ user: { id: 'u', name: 'Ada' } })).toEqual({ id: 'u', name: 'Ada' })
  })
})
