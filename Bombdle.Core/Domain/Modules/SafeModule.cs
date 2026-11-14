namespace Bombdle.Core.Domain.Modules;

public sealed class SafeModule(int id, string? label, int dialSize) : PuzzleModule(id, label)
{
    public const bool DistinctNumbers = true;

    public int DialSize { get; } = dialSize;
}
