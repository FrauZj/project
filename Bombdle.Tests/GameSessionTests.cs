namespace Bombdle.Tests;

using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Generation;
using Bombdle.Core.Rules;

public class GameSessionTests
{
    private static readonly PuzzleGenerator Generator = new();

    /// <summary>The first day of 2026 with all three kinds of module, so every rule can be tried on it.</summary>
    internal static readonly Bomb AllKinds = DayWhere(b =>
        b.Modules.OfType<WireSetModule>().Any() && b.Modules.OfType<KeypadModule>().Any() && b.Modules.OfType<SafeModule>().Any());

    private readonly Bomb _bomb = AllKinds;

    private IEnumerable<SecretPanelModule> Panels => _bomb.Modules.OfType<SecretPanelModule>();
    private KeypadModule Keypad => _bomb.Modules.OfType<KeypadModule>().First();
    private SafeModule Safe => _bomb.Modules.OfType<SafeModule>().First();
    private string Code => _bomb.Solution.KeypadCodes[Keypad.Id];
    private SafeCombo Combo => _bomb.Solution.SafeCombos[Safe.Id];

    /// <summary>The first day of 2026 (or later) that matches, e.g. one with the cutters hidden in a panel.</summary>
    internal static Bomb DayWhere(Func<Bomb, bool> predicate) =>
        Enumerable.Range(0, 365)
            .Select(day => Generator.Generate(new DateOnly(2026, 1, 1).AddDays(day)))
            .First(predicate);

    /// <summary>A fresh session with every panel removed, so all modules, tools and notes are in reach.</summary>
    private GameSession Opened()
    {
        var session = new GameSession(_bomb);
        foreach (var panel in Panels)
            Assert.Equal(ActionResult.Ok, session.Apply(PlayerAction.UnfastenPanel(0, panel.Id, Tool.Wrench)));
        return session;
    }

    private (WireSetModule Set, int Position) WrongWire()
    {
        var set = _bomb.Modules.OfType<WireSetModule>().First();
        return (set, set.Wires.First(w => !_bomb.Solution.MustCut(set.Id, w.Position)).Position);
    }

    private IEnumerable<PlayerAction> PerfectPlay()
    {
        long t = 0;
        foreach (var panel in Panels)
            yield return PlayerAction.UnfastenPanel(t += 1000, panel.Id, panel.Fastener.RequiredTool());
        foreach (var set in _bomb.Modules.OfType<WireSetModule>())
            foreach (var wire in set.Wires.Where(w => _bomb.Solution.MustCut(set.Id, w.Position)))
                yield return PlayerAction.CutWire(t += 1000, set.Id, wire.Position);
        foreach (var keypad in _bomb.Modules.OfType<KeypadModule>())
            yield return PlayerAction.EnterCode(t += 1000, keypad.Id, _bomb.Solution.KeypadCodes[keypad.Id]);
        foreach (var safe in _bomb.Modules.OfType<SafeModule>())
            yield return PlayerAction.EnterCombo(t += 1000, safe.Id, _bomb.Solution.SafeCombos[safe.Id]);
    }

    [Fact]
    public void Replay_PerfectPlay_Defuses()
    {
        var session = GameSession.Replay(_bomb, PerfectPlay());

        Assert.Equal(Outcome.Defused, session.Outcome);
        Assert.Equal(0, session.Strikes);
        Assert.Equal(PerfectPlay().Count(), session.ActionCount);
        Assert.Equal(PerfectPlay().Last().T, session.ElapsedMs);
    }

    [Fact]
    public void Replay_PerfectPlayWithoutTheLastSafe_IsNotDefused()
    {
        var session = GameSession.Replay(_bomb, PerfectPlay().SkipLast(1));

        Assert.Equal(Outcome.InProgress, session.Outcome);
    }

    [Fact]
    public void Apply_ModuleInAClosedBay_IsIgnoredAndNotCounted()
    {
        var session = new GameSession(_bomb);
        var bay = _bomb.CoverOf(Keypad.Id)!;

        Assert.Equal(ActionResult.Ignored, session.Apply(PlayerAction.EnterCode(1, Keypad.Id, Code)));   // can't reach it
        Assert.Equal(0, session.ActionCount);
        Assert.Equal(ActionResult.Ok, session.Apply(PlayerAction.UnfastenPanel(2, bay.Id, Tool.Wrench)));
        Assert.Equal(ActionResult.Ok, session.Apply(PlayerAction.EnterCode(3, Keypad.Id, Code)));
    }

    [Fact]
    public void Apply_WrongWire_StrikesOnceAndStaysCut()
    {
        var session = Opened();
        var (set, position) = WrongWire();

        Assert.Equal(ActionResult.Strike, session.Apply(PlayerAction.CutWire(1, set.Id, position)));
        Assert.Equal(ActionResult.Ignored, session.Apply(PlayerAction.CutWire(2, set.Id, position)));
        Assert.Equal(1, session.Strikes);
    }

    [Fact]
    public void Apply_ScrewdriverOnToughBolts_IsIgnored()
    {
        var session = new GameSession(_bomb);
        var panel = Panels.First();

        Assert.Equal(ActionResult.Ignored, session.Apply(PlayerAction.UnfastenPanel(1, panel.Id, Tool.Screwdriver)));
        Assert.False(session.IsPanelRemoved(panel.Id));
        Assert.Equal(0, session.Strikes);
        Assert.Equal(0, session.ActionCount);
    }

    [Fact]
    public void Apply_WrenchOnWire_IsIgnored()
    {
        var session = Opened();
        var (set, position) = WrongWire();

        Assert.Equal(ActionResult.Ignored, session.Apply(new PlayerAction(1, Tool.Wrench, set.Id, "wire:" + position)));
        Assert.Equal(0, session.Strikes);
        Assert.Equal(ActionResult.Strike, session.Apply(PlayerAction.CutWire(2, set.Id, position)));   // not cut by the wrench
    }

    [Fact]
    public void Apply_WireCuttersOnKeypad_IsIgnoredButWrongCode_Strikes()
    {
        var session = Opened();
        string wrongCode = Code == "012" ? "345" : "012";

        Assert.Equal(ActionResult.Ignored, session.Apply(new PlayerAction(1, Tool.WireCutters, Keypad.Id, "code:" + Code)));
        Assert.Equal(ActionResult.Strike, session.Apply(PlayerAction.EnterCode(2, Keypad.Id, wrongCode)));
        Assert.Equal(1, session.Strikes);
    }

    [Fact]
    public void Apply_ToolOnSafe_IsIgnoredButWrongCombo_Strikes()
    {
        var session = Opened();
        var wrongCombo = new SafeCombo(Combo.Right, Combo.Left);   // the right numbers in the wrong order

        Assert.Equal(ActionResult.Ignored, session.Apply(new PlayerAction(1, Tool.Wrench, Safe.Id, "combo:" + Combo)));
        Assert.Equal(ActionResult.Strike, session.Apply(PlayerAction.EnterCombo(2, Safe.Id, wrongCombo)));
        Assert.Equal(1, session.Strikes);
    }

    [Fact]
    public void Apply_RightCombo_OpensTheSafeOnce()
    {
        var session = Opened();

        Assert.Equal(ActionResult.Ok, session.Apply(PlayerAction.EnterCombo(1, Safe.Id, Combo)));
        Assert.Equal(ActionResult.Ignored, session.Apply(PlayerAction.EnterCombo(2, Safe.Id, Combo)));
    }

    [Theory]
    [InlineData("combo:10")]
    [InlineData("combo:0-3")]
    [InlineData("combo:26-1")]
    [InlineData("combo:a-3")]
    [InlineData("combo:10-3-1")]
    [InlineData("combo:+1-2")]
    [InlineData("dial:10-3")]
    public void Apply_MalformedCombo_IsIgnored(string target)
    {
        var session = Opened();

        Assert.Equal(ActionResult.Ignored, session.Apply(new PlayerAction(1, Tool.None, Safe.Id, target)));
    }

    [Fact]
    public void Apply_ThirdStrike_ExplodesAndFurtherActionsAreIgnored()
    {
        var session = Opened();
        var wrongCodes = new[] { "012", "345", "678", "901" }.Where(c => c != Code).Take(3);

        foreach (var code in wrongCodes)
            session.Apply(PlayerAction.EnterCode(1, Keypad.Id, code));

        Assert.Equal(Outcome.Exploded, session.Outcome);
        Assert.Equal(GameSession.MaxStrikes, session.Strikes);
        Assert.Equal(ActionResult.Ignored, session.Apply(PlayerAction.EnterCode(2, Keypad.Id, Code)));
    }

    [Fact]
    public void Apply_ToolOnNote_IsAlwaysIgnored()
    {
        var session = new GameSession(_bomb);
        var panel = Panels.First(p => p.ContentIds.Any(id => _bomb.Modules.Single(m => m.Id == id) is ClueModule));
        int note = panel.ContentIds.First(id => _bomb.Modules.Single(m => m.Id == id) is ClueModule);
        var poke = new PlayerAction(1, Tool.Wrench, note, "card");

        Assert.Equal(ActionResult.Ignored, session.Apply(poke));          // can't reach it: still inside
        session.Apply(PlayerAction.UnfastenPanel(2, panel.Id, Tool.Wrench));
        Assert.Equal(ActionResult.Ignored, session.Apply(poke));          // reachable now, but a tool does nothing to a note
        Assert.Equal(0, session.Strikes);
    }

    [Fact]
    public void Apply_HiddenCutters_AreIgnoredUntilTheirPanelIsRemoved()
    {
        // A day where the cutters hide somewhere other than the first wire panel's own bay, so the
        // wires can be reached while the cutters are still missing.
        var bomb = DayWhere(b => b.PanelHiding(Tool.WireCutters) is { } hiding &&
            b.Modules.OfType<WireSetModule>().FirstOrDefault() is { } first && b.CoverOf(first.Id) != hiding);
        var panel = bomb.PanelHiding(Tool.WireCutters)!;
        var set = bomb.Modules.OfType<WireSetModule>().First();
        var session = new GameSession(bomb);
        session.Apply(PlayerAction.UnfastenPanel(1, bomb.CoverOf(set.Id)!.Id, Tool.Wrench));

        Assert.False(session.HasTool(Tool.WireCutters));
        Assert.Equal(ActionResult.Ignored, session.Apply(PlayerAction.CutWire(2, set.Id, 0)));
        Assert.Equal(ActionResult.Ok, session.Apply(PlayerAction.UnfastenPanel(3, panel.Id, Tool.Wrench)));
        Assert.True(session.HasTool(Tool.WireCutters));
        Assert.NotEqual(ActionResult.Ignored, session.Apply(PlayerAction.CutWire(4, set.Id, 0)));
    }

    [Fact]
    public void Apply_BareHand_IsNeverPunished()
    {
        var session = Opened();
        var (set, position) = WrongWire();

        Assert.Equal(ActionResult.Ignored, session.Apply(PlayerAction.CutWire(1, set.Id, position, Tool.None)));
        Assert.Equal(ActionResult.Ignored, session.Apply(new PlayerAction(2, Tool.None, Safe.Id, "look")));
        Assert.Equal(0, session.Strikes);
    }

    [Fact]
    public void Apply_BareHandOnAPanel_IsIgnored()
    {
        var session = new GameSession(_bomb);
        var panel = Panels.First();

        Assert.Equal(ActionResult.Ignored, session.Apply(PlayerAction.UnfastenPanel(1, panel.Id, Tool.None)));
        Assert.False(session.IsPanelRemoved(panel.Id));
    }

    [Theory]
    [InlineData("code:12")]
    [InlineData("code:12a")]
    [InlineData("press")]
    public void Apply_MalformedCode_IsIgnored(string target)
    {
        var session = Opened();

        Assert.Equal(ActionResult.Ignored, session.Apply(new PlayerAction(1, Tool.None, Keypad.Id, target)));
    }

    [Fact]
    public void Apply_UnknownModule_IsIgnored()
    {
        Assert.Equal(ActionResult.Ignored, new GameSession(_bomb).Apply(PlayerAction.CutWire(1, 999, 0)));
    }
}
