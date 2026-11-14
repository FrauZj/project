namespace Bombdle.Core.Clues;

using Bombdle.Core.Random;

/// <summary>Result of selecting clues for one module.</summary>
public sealed record ClueSelection<T>(IReadOnlyList<Clue<T>> Essential, IReadOnlyList<Clue<T>> Redundant);

/// <summary>
/// Picks the clues for one module for every module type
/// </summary>
public static class ClueSelector
{
    public static ClueSelection<T> Select<T>(
        IReadOnlyList<T> candidates, IEnumerable<Clue<T>> trueClues, Mulberry32 rng)
    {
        var pool = trueClues.ToList();
        rng.Shuffle(pool);
        pool = pool.OrderBy(c => c.Tier).ToList();   

        //greedy
        var kept = new List<Clue<T>>();
        var redundant = new List<Clue<T>>();
        var remaining = candidates.ToList();
        foreach (var clue in pool)
        {
            var filtered = remaining.Count > 1 ? remaining.Where(clue.Holds).ToList() : remaining;
            if (filtered.Count < remaining.Count)
            {
                kept.Add(clue);
                remaining = filtered;
            }
            else
            {
                redundant.Add(clue);
            }
        }

        //reaching more than one candidate here would be an error
        if (remaining.Count != 1)
            throw new InvalidOperationException("True clue pool cannot identify the answer.");

        // Prune
        for (int i = kept.Count - 1; i >= 0; i--)
        {
            var without = kept.Where((_, k) => k != i);
            if (ClueSolver.IsUnique(candidates, without))
            {
                redundant.Add(kept[i]);
                kept.RemoveAt(i);
            }
        }

        return new ClueSelection<T>(kept, redundant);
    }
}
