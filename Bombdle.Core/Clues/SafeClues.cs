namespace Bombdle.Core.Clues;

using Bombdle.Core.Domain;

public enum DialTurn
{
    Left,
    Right,
}

public abstract record SafeClue : Clue<SafeCombo>
{
    protected static int NumberOf(SafeCombo combo, DialTurn turn) => turn == DialTurn.Left ? combo.Left : combo.Right;

    protected static string Name(DialTurn turn) => turn == DialTurn.Left ? "left" : "right";
}

public sealed record SafeNumberIs(DialTurn Turn, int Number) : SafeClue
{
    public override ClueTier Tier => ClueTier.Direct;

    protected override string Statement => $"turn {Name(Turn)} to {Number}.";

    public override bool Holds(SafeCombo combo) => NumberOf(combo, Turn) == Number;
}

public sealed record SafeNumberParity(DialTurn Turn, bool Even) : SafeClue
{
    public override ClueTier Tier => ClueTier.Weak;

    protected override string Statement => $"the {Name(Turn)} number is {(Even ? "even" : "odd")}.";

    public override bool Holds(SafeCombo combo) => (NumberOf(combo, Turn) % 2 == 0) == Even;
}

public sealed record SafeNumberAbove(DialTurn Turn, int Threshold, bool Above) : SafeClue
{
    public override ClueTier Tier => ClueTier.Weak;

    protected override string Statement => Above
        ? $"the {Name(Turn)} number is greater than {Threshold}."
        : $"the {Name(Turn)} number is {Threshold} or less.";

    public override bool Holds(SafeCombo combo) => (NumberOf(combo, Turn) > Threshold) == Above;
}

public sealed record SafeMultipleOfFive(DialTurn Turn, bool IsMultiple) : SafeClue
{
    public override ClueTier Tier => ClueTier.Weak;

    protected override string Statement =>
        $"the {Name(Turn)} number is {(IsMultiple ? "" : "not ")}a multiple of 5.";

    public override bool Holds(SafeCombo combo) => (NumberOf(combo, Turn) % 5 == 0) == IsMultiple;
}

public sealed record SafeSum(int Sum) : SafeClue
{
    protected override string Statement => $"the two numbers add up to {Sum}.";

    public override bool Holds(SafeCombo combo) => combo.Left + combo.Right == Sum;
}

public sealed record SafeApart(int Difference) : SafeClue
{
    protected override string Statement => $"the two numbers are {Difference} apart.";

    public override bool Holds(SafeCombo combo) => Math.Abs(combo.Left - combo.Right) == Difference;
}

public sealed record SafeOrder(bool LeftIsLarger) : SafeClue
{
    protected override string Statement =>
        $"the left number is {(LeftIsLarger ? "larger" : "smaller")} than the right number.";

    public override bool Holds(SafeCombo combo) => (combo.Left > combo.Right) == LeftIsLarger;
}

public sealed record SafeOddCount(int Count) : SafeClue
{
    protected override string Statement => Count switch
    {
        0 => "both numbers are even.",
        1 => "exactly one of the two numbers is odd.",
        _ => "both numbers are odd.",
    };

    public override bool Holds(SafeCombo combo) => combo.Left % 2 + combo.Right % 2 == Count;
}
public sealed record SafeMultipleOfOther(DialTurn Multiple) : SafeClue
{
    protected override string Statement =>
        $"the {Name(Multiple)} number is a multiple of the {Name(Other)} number.";

    private DialTurn Other => Multiple == DialTurn.Left ? DialTurn.Right : DialTurn.Left;

    public override bool Holds(SafeCombo combo) => NumberOf(combo, Multiple) % NumberOf(combo, Other) == 0;
}
