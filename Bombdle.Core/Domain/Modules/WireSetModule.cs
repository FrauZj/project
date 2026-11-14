namespace Bombdle.Core.Domain.Modules;

/// Position 0 is the top wire, colors are unique within a wire set.
public sealed record Wire(int Position, string Color, int TiltDegrees);

public sealed class WireSetModule(int id, string? label, IReadOnlyList<Wire> wires) : PuzzleModule(id, label)
{
    public IReadOnlyList<Wire> Wires { get; } = wires;
}
