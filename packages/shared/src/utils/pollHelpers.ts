const VOTE_PREFIX = 'vote:'

export function isVoteKey(key: string): boolean {
  return key.startsWith(VOTE_PREFIX)
}

export function userIdFromVoteKey(key: string): string {
  return key.slice(VOTE_PREFIX.length)
}

export function parseVotesFromYMap(
  entries: Map<string, unknown>,
): Record<string, 'yes' | 'no'> {
  const votes: Record<string, 'yes' | 'no'> = {}
  for (const [key, value] of entries) {
    if (isVoteKey(key) && (value === 'yes' || value === 'no')) {
      votes[userIdFromVoteKey(key)] = value
    }
  }
  return votes
}

export function resolveVotes(
  votes: Record<string, 'yes' | 'no'>,
): 'keep' | 'remove' {
  let yes = 0
  let no = 0
  for (const v of Object.values(votes)) {
    if (v === 'yes') yes++
    else no++
  }
  return no > yes ? 'remove' : 'keep'
}
