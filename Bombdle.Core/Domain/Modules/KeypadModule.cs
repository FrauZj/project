namespace Bombdle.Core.Domain.Modules;

public sealed class KeypadModule(int id, string? label, int codeLength) : PuzzleModule(id, label)
{
    public const bool DistinctDigits = true;

    public int CodeLength { get; } = codeLength;
}
