namespace Bombdle.Core.Clues;

/// <summary>
/// Brute-force solver.
/// </summary>
public static class ClueSolver
{
    public static IEnumerable<T> Solutions<T>(IEnumerable<T> candidates, IEnumerable<Clue<T>> clues)
    {
        var list = clues as IReadOnlyCollection<Clue<T>> ?? clues.ToList();
        return candidates.Where(c => list.All(clue => clue.Holds(c)));
    }
    public static bool IsUnique<T>(IEnumerable<T> candidates, IEnumerable<Clue<T>> clues) =>
        Solutions(candidates, clues).Take(2).Count() == 1;
}
