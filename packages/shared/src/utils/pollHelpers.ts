/**
 * @module pollHelpers
 * Helpers for the collaborative poll feature on calendar activities.
 * Yjs Y.Map entries for polls use a `"vote:<userId>"` key convention so that
 * votes from different collaborators do not conflict.
 *
 * These utilities parse and resolve those vote entries, and are used by
 * `useActivityMutations` and the PollCard component.
 */

/** Prefix used for vote entries in the Yjs activity Y.Map */
const VOTE_PREFIX = 'vote:'

/**
 * Returns true if a Y.Map key is a vote entry (i.e. starts with `"vote:"`).
 * @param key - Y.Map key to test
 * @returns `true` if the key encodes a vote
 * @example isVoteKey("vote:user-uuid-123") // → true
 * @example isVoteKey("title")              // → false
 */
export function isVoteKey(key: string): boolean {
  return key.startsWith(VOTE_PREFIX)
}

/**
 * Extracts the userId from a vote key by stripping the `"vote:"` prefix.
 * @param key - Vote key in the form `"vote:<userId>"`
 * @returns The userId portion of the key
 * @example userIdFromVoteKey("vote:user-uuid-123") // → "user-uuid-123"
 */
export function userIdFromVoteKey(key: string): string {
  return key.slice(VOTE_PREFIX.length)
}

/**
 * Parses a Y.Map's entries and extracts all valid vote entries into a plain object.
 * Only entries whose key passes {@link isVoteKey} and whose value is `"yes"` or `"no"`
 * are included.
 *
 * @param entries - Y.Map entries as a `Map<string, unknown>`
 * @returns Map from userId to their vote (`"yes"` or `"no"`)
 * @example
 * parseVotesFromYMap(new Map([["vote:alice", "yes"], ["title", "Dinner"]]))
 * // → { alice: "yes" }
 */
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

/**
 * Resolves a set of votes into a final outcome.
 * If "no" votes outnumber "yes" votes, the activity should be removed;
 * otherwise it should be kept.
 *
 * @param votes - Map from userId to their vote (`"yes"` | `"no"`)
 * @returns `"remove"` if no > yes, `"keep"` otherwise
 * @example resolveVotes({ alice: "no", bob: "no", carol: "yes" }) // → "remove"
 * @example resolveVotes({ alice: "yes", bob: "yes" })             // → "keep"
 */
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
