namespace Bombdle.Core.Clues;

public abstract record KeypadClue : Clue<string>
{
    protected static string Ordinal(int position) => (position + 1) switch
    {
        1 => "1st", 2 => "2nd", 3 => "3rd", var n => $"{n}th",
    };
}

public sealed record KeyDigitAt(int Position, char Digit) : KeypadClue
{
    public override ClueTier Tier => ClueTier.Direct;

    protected override string Statement => $"the {Ordinal(Position)} digit is {Digit}.";

    public override bool Holds(string code) => code[Position] == Digit;
}

public sealed record KeyContainsNotAt(char Digit, int Position) : KeypadClue
{
    protected override string Statement => $"{Digit} is in the code, but not in {Ordinal(Position)} place.";

    public override bool Holds(string code) => code.Contains(Digit) && code[Position] != Digit;
}

public sealed record KeyContains(char Digit) : KeypadClue
{
    public override ClueTier Tier => ClueTier.Weak;

    protected override string Statement => $"the code contains a {Digit}.";

    public override bool Holds(string code) => code.Contains(Digit);
}

public sealed record KeyNotContains(char Digit) : KeypadClue
{
    public override ClueTier Tier => ClueTier.Weak;

    protected override string Statement => $"there is no {Digit} in the code.";

    public override bool Holds(string code) => !code.Contains(Digit);
}

public sealed record KeyBefore(char First, char Second) : KeypadClue
{
    protected override string Statement => $"{First} comes somewhere before {Second}.";

    public override bool Holds(string code)
    {
        int a = code.IndexOf(First), b = code.IndexOf(Second);
        return a >= 0 && b >= 0 && a < b;
    }
}

public sealed record KeyFollowedBy(char First, char Second) : KeypadClue
{
    protected override string Statement => $"{First} is immediately followed by {Second}.";

    public override bool Holds(string code)
    {
        int a = code.IndexOf(First);
        return a >= 0 && a + 1 < code.Length && code[a + 1] == Second;
    }
}

public sealed record KeyDigitSum(int Sum) : KeypadClue
{
    protected override string Statement => $"the digits add up to {Sum}.";

    public override bool Holds(string code) => code.Sum(c => c - '0') == Sum;
}

public sealed record KeyEvenCount(int Count) : KeypadClue
{
    protected override string Statement => Count == 1
        ? "exactly 1 digit is even (0 counts as even)."
        : $"exactly {Count} digits are even (0 counts as even).";

    public override bool Holds(string code) => code.Count(c => (c - '0') % 2 == 0) == Count;
}
