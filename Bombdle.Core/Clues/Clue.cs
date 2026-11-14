namespace Bombdle.Core.Clues;

/// <summary>Anything printed on a clue card.</summary>
public abstract record Clue
{
    /// <summary>The sentence the player reads.</summary>
    public abstract string Text { get; }
}

/// <summary>
/// How much a clue gives away
/// </summary>
public enum ClueTier
{
    Deductive = 0,  // relations between parts
    Weak = 1,       // true, but rarely decisive
    Direct = 2,     // states part of the answer outright
}

/// <summary>
/// A clue that constrains one module.
/// </summary>
public abstract record Clue<TCandidate> : Clue
{
    public virtual ClueTier Tier => ClueTier.Deductive;

    /// <summary>The module's letter when the bomb has two modules of its kind</summary>
    public string? Label { get; init; }
    protected abstract string Kind { get; }
    protected abstract string Statement { get; }
    public sealed override string Text => Label is null ? $"{Kind}: {Statement}" : $"{Kind} {Label}: {Statement}";
    public abstract bool Holds(TCandidate candidate);
}

/// <summary>
/// Pure flavour text 
/// </summary>
public sealed record FlavourClue(string Line) : Clue
{
    public override string Text => Line;
}
