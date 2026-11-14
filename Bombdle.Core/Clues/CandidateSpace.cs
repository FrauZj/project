namespace Bombdle.Core.Clues;

using Bombdle.Core.Domain;

/// <summary>
/// Every answer the PLAYER could think is possible, before reading any clue.
/// </summary>
public static class CandidateSpace
{
    /// <summary>All 2^n cut masks for n wires.</summary>
    public static IReadOnlyList<int> WireMasks(int wireCount) =>
        Enumerable.Range(0, 1 << wireCount).ToArray();

    /// <summary>All codes of the given length with distinct digits.</summary>
    public static IReadOnlyList<string> KeypadCodes(int length)
    {
        var codes = new List<string>();
        Build("", length, codes);
        return codes;

        static void Build(string prefix, int length, List<string> output)
        {
            if (prefix.Length == length) { output.Add(prefix); return; }
            foreach (char d in "0123456789")
                if (!prefix.Contains(d)) Build(prefix + d, length, output);
        }
    }

    /// <summary>All ordered pairs of two different numbers on the dial.</summary>
    public static IReadOnlyList<SafeCombo> SafeCombos(int dialSize) =>
        (from left in Enumerable.Range(1, dialSize)
         from right in Enumerable.Range(1, dialSize)
         where left != right
         select new SafeCombo(left, right)).ToArray();
}
