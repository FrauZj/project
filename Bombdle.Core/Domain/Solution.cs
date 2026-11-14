namespace Bombdle.Core.Domain;

/// <summary>
/// The secret answer to a bomb. 
/// </summary>
public sealed record Solution(
    IReadOnlyDictionary<int, int> WireCutMasks,         // wire set id -> cut mask
    IReadOnlyDictionary<int, string> KeypadCodes,       // keypad id   -> code
    IReadOnlyDictionary<int, SafeCombo> SafeCombos)     // safe id     -> combination
{
    public bool MustCut(int wireSetId, int position) =>
        (WireCutMasks[wireSetId] & (1 << position)) != 0;
}
