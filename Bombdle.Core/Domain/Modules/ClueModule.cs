namespace Bombdle.Core.Domain.Modules;

using Bombdle.Core.Clues;

/// <summary>
/// One clue.
/// </summary>
public sealed class ClueModule(int id, Clue clue, int? targetModuleId) : Module(id)
{
    public Clue Clue { get; } = clue;

    public int? TargetModuleId { get; } = targetModuleId;
}
