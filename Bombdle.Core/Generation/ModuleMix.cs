namespace Bombdle.Core.Generation;

using Bombdle.Core.Random;

/// <summary>The kinds of module a bay can hold.</summary>
internal enum ModuleKind
{
    Wires,
    Keypad,
    Safe,
}

/// <summary>
/// Which module each bay holds today
/// </summary>
internal static class ModuleMix
{
    public const int MaxPerKind = 2;
    private const int EmptyBayOneIn = 3;

    /// <summary>One entry per bay</summary>
    public static IReadOnlyList<ModuleKind?> Roll(Mulberry32 rng, int bayCount)
    {
        var kinds = Enum.GetValues<ModuleKind>().ToList();
        rng.Shuffle(kinds);

        var mix = new List<ModuleKind?> { kinds[0], kinds[1] };
        while (mix.Count < bayCount)
        {
            var allowed = kinds.Where(kind => mix.Count(m => m == kind) < MaxPerKind).ToList();
            bool empty = allowed.Count == 0 || rng.NextInt(EmptyBayOneIn) == 0;
            mix.Add(empty ? null : rng.Pick(allowed));
        }

        rng.Shuffle(mix);
        return mix;
    }

    /// <summary>
    /// Per bay, the module's letter.
    /// "A" and "B" for a kind that appears twice
    /// </summary>
    public static string?[] Letters(IReadOnlyList<ModuleKind?> mix)
    {
        var letters = new string?[mix.Count];
        var groups = Enumerable.Range(0, mix.Count).Where(bay => mix[bay] is not null).GroupBy(bay => mix[bay]);
        foreach (var bays in groups.Where(g => g.Count() > 1))
        {
            char letter = 'A';
            foreach (int bay in bays)
                letters[bay] = (letter++).ToString();
        }

        return letters;
    }
}
