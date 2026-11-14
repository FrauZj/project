namespace Bombdle.Core.Clues;

using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;

/// <summary>
/// Builds every clue that is TRUE for a known answer.
/// </summary>
public static class ClueFactories
{
    /// <summary>Thresholds for "the left number is greater than 10 / 20 or less" clues.</summary>
    private static readonly int[] SafeThresholds = [10, 20];

    public static IEnumerable<WireClue> TrueWireClues(WireSetModule set, int cutMask)
    {
        bool IsCut(Wire w) => (cutMask & (1 << w.Position)) != 0;

        yield return new WireCutCount(set.Wires.Count(IsCut));

        foreach (Wire a in set.Wires)
        {
            yield return new WireColorFate(a, IsCut(a));
            yield return new WirePositionFate(a, IsCut(a));

            foreach (Wire b in set.Wires.Where(b => b.Position > a.Position))
            {
                yield return IsCut(a) != IsCut(b)
                    ? new WireExactlyOneOf(a, b)
                    : new WireSameFate(a, b);
            }

            foreach (Wire b in set.Wires.Where(b => b != a && (!IsCut(a) || IsCut(b))))
                yield return new WireCutImplies(a, b);
        }
    }

    public static IEnumerable<KeypadClue> TrueKeypadClues(string code)
    {
        for (int i = 0; i < code.Length; i++)
        {
            yield return new KeyDigitAt(i, code[i]);

            for (int j = 0; j < code.Length; j++)
            {
                if (j != i) yield return new KeyContainsNotAt(code[i], j);
                if (j > i) yield return new KeyBefore(code[i], code[j]);
            }

            if (i + 1 < code.Length)
                yield return new KeyFollowedBy(code[i], code[i + 1]);
        }

        foreach (char d in "0123456789")
            yield return code.Contains(d) ? new KeyContains(d) : new KeyNotContains(d);

        yield return new KeyDigitSum(code.Sum(c => c - '0'));
        yield return new KeyEvenCount(code.Count(c => (c - '0') % 2 == 0));
    }

    public static IEnumerable<SafeClue> TrueSafeClues(SafeCombo combo)
    {
        foreach (var turn in new[] { DialTurn.Left, DialTurn.Right })
        {
            int n = turn == DialTurn.Left ? combo.Left : combo.Right;
            yield return new SafeNumberIs(turn, n);
            yield return new SafeNumberParity(turn, Even: n % 2 == 0);
            yield return new SafeMultipleOfFive(turn, IsMultiple: n % 5 == 0);
            foreach (int threshold in SafeThresholds)
                yield return new SafeNumberAbove(turn, threshold, Above: n > threshold);
        }

        yield return new SafeSum(combo.Left + combo.Right);
        yield return new SafeApart(Math.Abs(combo.Left - combo.Right));
        yield return new SafeOrder(LeftIsLarger: combo.Left > combo.Right);
        yield return new SafeOddCount(combo.Left % 2 + combo.Right % 2);

        if (combo.Left % combo.Right == 0) yield return new SafeMultipleOfOther(DialTurn.Left);
        if (combo.Right % combo.Left == 0) yield return new SafeMultipleOfOther(DialTurn.Right);
    }
}
