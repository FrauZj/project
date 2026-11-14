namespace Bombdle.Core.Rules;

using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;

public enum ActionResult
{
    Ok,       // the action was correct and changed the bomb
    Strike,   // wrong wire, wrong code, wrong combination
    Ignored,  
}

public enum Outcome
{
    InProgress,
    Defused,
    Exploded,
}

/// <summary>
/// The single source of truth for the game rules. Server only.
/// </summary>
public sealed class GameSession
{
    public const int MaxStrikes = 3;

    private readonly Bomb _bomb;
    private readonly Dictionary<int, Module> _modules;
    private readonly HashSet<(int SetId, int Position)> _cutWires = [];
    private readonly HashSet<int> _removedPanels = [];
    private readonly HashSet<int> _solvedKeypads = [];
    private readonly HashSet<int> _openedSafes = [];

    public GameSession(Bomb bomb)
    {
        _bomb = bomb;
        _modules = bomb.Modules.ToDictionary(m => m.Id);
    }

    public int Strikes { get; private set; }

    public Outcome Outcome { get; private set; } = Outcome.InProgress;

    public int ActionCount { get; private set; }

    //Timestamp of the last counted action, i.e. play time so far
    public long ElapsedMs { get; private set; }

    public bool IsPanelRemoved(int panelId) => _removedPanels.Contains(panelId);

    public bool HasTool(Tool tool) => _bomb.PanelHiding(tool) is not { } panel || _removedPanels.Contains(panel.Id);

    /// <summary>Replays a whole action log on a fresh session </summary>
    public static GameSession Replay(Bomb bomb, IEnumerable<PlayerAction> log)
    {
        var session = new GameSession(bomb);
        foreach (var action in log)
            session.Apply(action);
        return session;
    }

    public ActionResult Apply(PlayerAction action)
    {
        if (Outcome != Outcome.InProgress) return ActionResult.Ignored;
        if (!_modules.TryGetValue(action.ModuleId, out var module)) return ActionResult.Ignored;
        if (IsCovered(module)) return ActionResult.Ignored;
        if (!HasTool(action.Tool)) return ActionResult.Ignored;

        var result = module switch
        {
            SecretPanelModule panel => RemovePanel(panel, action),
            WireSetModule set => CutWire(set, action),
            KeypadModule keypad => EnterCode(keypad, action),
            SafeModule safe => OpenSafe(safe, action),
            _ => ActionResult.Ignored,
        };

        if (result == ActionResult.Ignored) return result;

        ActionCount++;
        ElapsedMs = Math.Max(ElapsedMs, action.T);

        if (result == ActionResult.Strike && ++Strikes >= MaxStrikes)
            Outcome = Outcome.Exploded;
        else if (result == ActionResult.Ok && IsDefused())
            Outcome = Outcome.Defused;

        return result;
    }

    private bool IsCovered(Module module) =>
        _bomb.CoverOf(module.Id) is { } panel && !_removedPanels.Contains(panel.Id);

    private ActionResult RemovePanel(SecretPanelModule panel, PlayerAction action)
    {
        if (action.Tool != panel.Fastener.RequiredTool() || action.Target != PlayerAction.PanelTarget) return ActionResult.Ignored;

        _removedPanels.Add(panel.Id);
        return ActionResult.Ok;
    }

    private ActionResult CutWire(WireSetModule set, PlayerAction action)
    {
        if (action.Tool != Tool.WireCutters) return ActionResult.Ignored;

        if (!action.Target.StartsWith(PlayerAction.WirePrefix, StringComparison.Ordinal) ||
            !int.TryParse(action.Target.AsSpan(PlayerAction.WirePrefix.Length), out int position) ||
            position < 0 || position >= set.Wires.Count)
            return ActionResult.Ignored;

        if (!_cutWires.Add((set.Id, position))) return ActionResult.Ignored;   // already cut

        return _bomb.Solution.MustCut(set.Id, position) ? ActionResult.Ok : ActionResult.Strike;
    }

    private ActionResult EnterCode(KeypadModule keypad, PlayerAction action)
    {
        if (action.Tool != Tool.None) return ActionResult.Ignored;   // keys are pressed by hand
        if (_solvedKeypads.Contains(keypad.Id)) return ActionResult.Ignored;
        if (!action.Target.StartsWith(PlayerAction.CodePrefix, StringComparison.Ordinal)) return ActionResult.Ignored;

        string code = action.Target[PlayerAction.CodePrefix.Length..];
        if (code.Length != keypad.CodeLength || !code.All(char.IsAsciiDigit)) return ActionResult.Ignored;

        if (code != _bomb.Solution.KeypadCodes[keypad.Id]) return ActionResult.Strike;

        _solvedKeypads.Add(keypad.Id);
        return ActionResult.Ok;
    }

    private ActionResult OpenSafe(SafeModule safe, PlayerAction action)
    {
        if (action.Tool != Tool.None) return ActionResult.Ignored;
        if (_openedSafes.Contains(safe.Id)) return ActionResult.Ignored;
        if (!action.Target.StartsWith(PlayerAction.ComboPrefix, StringComparison.Ordinal) ||
            !SafeCombo.TryParse(action.Target[PlayerAction.ComboPrefix.Length..], safe.DialSize, out var combo))
            return ActionResult.Ignored;

        if (combo != _bomb.Solution.SafeCombos[safe.Id]) return ActionResult.Strike;

        _openedSafes.Add(safe.Id);
        return ActionResult.Ok;
    }

    private bool IsDefused() =>
        _bomb.Solution.WireCutMasks.All(kv => AllRequiredCut(kv.Key, kv.Value)) &&
        _bomb.Solution.KeypadCodes.Keys.All(_solvedKeypads.Contains) &&
        _bomb.Solution.SafeCombos.Keys.All(_openedSafes.Contains);

    private bool AllRequiredCut(int setId, int mask)
    {
        for (int position = 0; mask >> position != 0; position++)
            if ((mask & (1 << position)) != 0 && !_cutWires.Contains((setId, position)))
                return false;
        return true;
    }
}
