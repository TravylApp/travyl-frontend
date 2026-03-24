import { describe, it, expect } from 'vitest'
import { parseVotesFromYMap, resolveVotes, isVoteKey, userIdFromVoteKey } from '../pollHelpers'

describe('isVoteKey', () => {
  it('returns true for vote: prefixed keys', () => {
    expect(isVoteKey('vote:abc-123')).toBe(true)
  })
  it('returns false for non-vote keys', () => {
    expect(isVoteKey('status')).toBe(false)
    expect(isVoteKey('startedBy')).toBe(false)
  })
})

describe('userIdFromVoteKey', () => {
  it('extracts userId from vote key', () => {
    expect(userIdFromVoteKey('vote:abc-123')).toBe('abc-123')
  })
})

describe('parseVotesFromYMap', () => {
  it('extracts vote entries from a flat key-value map', () => {
    const entries = new Map<string, unknown>([
      ['activityId', 'act-1'],
      ['startedBy', 'user-1'],
      ['status', 'active'],
      ['vote:user-1', 'yes'],
      ['vote:user-2', 'no'],
      ['vote:user-3', 'yes'],
    ])
    const votes = parseVotesFromYMap(entries)
    expect(votes).toEqual({
      'user-1': 'yes',
      'user-2': 'no',
      'user-3': 'yes',
    })
  })

  it('returns empty object when no votes exist', () => {
    const entries = new Map<string, unknown>([
      ['activityId', 'act-1'],
      ['status', 'active'],
    ])
    expect(parseVotesFromYMap(entries)).toEqual({})
  })
})

describe('resolveVotes', () => {
  it('returns "keep" when yes votes are majority', () => {
    expect(resolveVotes({ a: 'yes', b: 'yes', c: 'no' })).toBe('keep')
  })
  it('returns "remove" when no votes are majority', () => {
    expect(resolveVotes({ a: 'no', b: 'no', c: 'yes' })).toBe('remove')
  })
  it('returns "keep" on tie (benefit of the doubt)', () => {
    expect(resolveVotes({ a: 'yes', b: 'no' })).toBe('keep')
  })
  it('returns "keep" when no votes exist', () => {
    expect(resolveVotes({})).toBe('keep')
  })
})
