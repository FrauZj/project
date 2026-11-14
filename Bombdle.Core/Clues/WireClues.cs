namespace Bombdle.Core.Clues;

using System.Numerics;
using Bombdle.Core.Domain.Modules;

public abstract record WireClue : Clue<int>
{
    protected static bool IsCut(int mask, Wire wire) => (mask & (1 << wire.Position)) != 0;

    protected static string Ordinal(int position) => (position + 1) switch
    {
        1 => "1st", 2 => "2nd", 3 => "3rd", var n => $"{n}th",
    };
}

public sealed record WireCutCount(int Count) : WireClue
{
    protected override string Statement =>
        Count == 1 ? "exactly 1 wire must be cut." : $"exactly {Count} wires must be cut.";

    public override bool Holds(int mask) => BitOperations.PopCount((uint)mask) == Count;
}

public sealed record WireExactlyOneOf(Wire A, Wire B) : WireClue
{
    protected override string Statement => $"exactly one of the {A.Color} and {B.Color} wires must be cut.";

    public override bool Holds(int mask) => IsCut(mask, A) != IsCut(mask, B);
}

public sealed record WireSameFate(Wire A, Wire B) : WireClue
{
    protected override string Statement => $"cut both the {A.Color} and {B.Color} wires, or neither.";

    public override bool Holds(int mask) => IsCut(mask, A) == IsCut(mask, B);
}

public sealed record WireCutImplies(Wire If, Wire Then) : WireClue
{
    protected override string Statement => $"if the {If.Color} wire is cut, the {Then.Color} wire must be cut too.";

    public override bool Holds(int mask) => !IsCut(mask, If) || IsCut(mask, Then);
}

public sealed record WireColorFate(Wire Wire, bool Cut) : WireClue
{
    public override ClueTier Tier => ClueTier.Direct;

    protected override string Statement => Cut ? $"cut the {Wire.Color} wire." : $"do not cut the {Wire.Color} wire.";

    public override bool Holds(int mask) => IsCut(mask, Wire) == Cut;
}

public sealed record WirePositionFate(Wire Wire, bool Cut) : WireClue
{
    public override ClueTier Tier => ClueTier.Direct;

    protected override string Statement =>
        $"the {Ordinal(Wire.Position)} wire from the top must {(Cut ? "" : "not ")}be cut.";

    public override bool Holds(int mask) => IsCut(mask, Wire) == Cut;
}
