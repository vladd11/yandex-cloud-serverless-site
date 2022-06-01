/**
 * txControl object for Stale Read Only mode.
 * Docs:
 * Data reads in a transaction return results with a possible delay (fractions of a second).
 * Each individual read returns consistent data, but no consistency between different reads is guaranteed.
 */
const staleReadOnly = {
    beginTx: {
        staleReadOnly: {}
    },
    commitTx: true
}

export default staleReadOnly;