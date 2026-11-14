namespace Bombdle.Core.Domain.Modules;

/// <summary>
/// A module the player has to solve
/// </summary>
public abstract class PuzzleModule(int id, string? label) : Module(id)
{
    public string? Label { get; } = label;
}
