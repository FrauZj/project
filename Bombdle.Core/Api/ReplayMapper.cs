namespace Bombdle.Core.Api;

using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Rules;

/// <summary>Replays an action log and returns what the client may know afterwards.</summary>
public static class ReplayMapper
{
    public static ReplayResultDto Replay(Bomb bomb, IEnumerable<PlayerAction> log)
    {
        var session = new GameSession(bomb);
        var results = new List<ActionResult>();
        foreach (var action in log)
            results.Add(session.Apply(action));

        var removed = bomb.Modules.OfType<SecretPanelModule>()
            .Where(panel => session.IsPanelRemoved(panel.Id))
            .ToList();
        var modules = bomb.Modules.ToDictionary(m => m.Id);

        var revealed = removed
            .SelectMany(panel => panel.ContentIds.Select(id => modules[id]).OfType<ClueModule>()
                .Select(card => new RevealedClueDto(card.Id, panel.Id, card.Clue.Text)))
            .ToArray();
        var foundTools = removed
            .Where(panel => panel.HiddenTool is not null)
            .Select(panel => new FoundToolDto(panel.HiddenTool!.Value, panel.Id))
            .ToArray();
        var revealedModules = removed
            .SelectMany(panel => panel.ContentIds.Select(id => modules[id]).OfType<PuzzleModule>()
                .Select(module => new RevealedModuleDto(panel.Id, PuzzleMapper.ToDto(module))))
            .ToArray();

        return new ReplayResultDto(results, session.Strikes, GameSession.MaxStrikes, session.Outcome,
            session.ActionCount, session.ElapsedMs, revealed, foundTools, revealedModules);
    }
}
