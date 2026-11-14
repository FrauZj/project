namespace Bombdle.Tests;

using System.Text.Json;
using Bombdle.Core.Api;
using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Rules;

/// <summary>judging a log and revealing only what the player has earned</summary>
public class ReplayTests
{
    private readonly Bomb _bomb = GameSessionTests.AllKinds;

    private SecretPanelModule NotePanel => _bomb.Modules.OfType<SecretPanelModule>().First(p => p.ContentIds.Any(IsNote));

    private KeypadModule Keypad => _bomb.Modules.OfType<KeypadModule>().First();

    private bool IsNote(int id) => _bomb.Modules.Single(m => m.Id == id) is ClueModule;

    [Fact]
    public void Replay_PanelsStillOn_RevealsNothing()
    {
        var result = ReplayMapper.Replay(_bomb, []);

        Assert.Empty(result.Revealed);
        Assert.Empty(result.FoundTools);
        Assert.Empty(result.RevealedModules);
        Assert.Equal(Outcome.InProgress, result.Outcome);
    }

    [Fact]
    public void Replay_PanelRemoved_RevealsEveryNoteInsideWithThePanelId()
    {
        var log = new[] { PlayerAction.UnfastenPanel(500, NotePanel.Id, Tool.Wrench) };

        var result = ReplayMapper.Replay(_bomb, log);

        var notes = _bomb.Modules.OfType<ClueModule>().Where(c => NotePanel.ContentIds.Contains(c.Id));
        Assert.Equal(notes.Select(n => new RevealedClueDto(n.Id, NotePanel.Id, n.Clue.Text)), result.Revealed);
        Assert.Equal([ActionResult.Ok], result.Results);
    }

    [Fact]
    public void Replay_BayRemoved_RevealsItsModuleAndNoOther()
    {
        var bay = _bomb.CoverOf(Keypad.Id)!;

        var result = ReplayMapper.Replay(_bomb, [PlayerAction.UnfastenPanel(1, bay.Id, Tool.Wrench)]);

        var revealed = Assert.Single(result.RevealedModules);
        Assert.Equal(bay.Id, revealed.PanelId);
        var keypad = Assert.IsType<KeypadDto>(revealed.Module);
        Assert.Equal((Keypad.Id, Keypad.Label, Keypad.CodeLength), (keypad.Id, keypad.Label, keypad.CodeLength));
    }

    [Fact]
    public void Replay_BayOpenedWithTheWrongTool_RevealsNothing()
    {
        var bay = _bomb.CoverOf(Keypad.Id)!;

        var result = ReplayMapper.Replay(_bomb, [PlayerAction.UnfastenPanel(1, bay.Id, Tool.Screwdriver)]);

        Assert.Equal([ActionResult.Ignored], result.Results);
        Assert.Empty(result.RevealedModules);
    }

    [Fact]
    public void Replay_PanelHidingTheCutters_ReportsThemFound()
    {
        var bomb = GameSessionTests.DayWhere(b => b.PanelHiding(Tool.WireCutters) is not null);
        var panel = bomb.PanelHiding(Tool.WireCutters)!;

        Assert.Empty(ReplayMapper.Replay(bomb, []).FoundTools);

        var result = ReplayMapper.Replay(bomb, [PlayerAction.UnfastenPanel(1, panel.Id, Tool.Wrench)]);
        Assert.Equal([new FoundToolDto(Tool.WireCutters, panel.Id)], result.FoundTools);
    }

    [Fact]
    public void Replay_ReturnsOneVerdictPerAction()
    {
        string wrongCode = _bomb.Solution.KeypadCodes[Keypad.Id] == "012" ? "345" : "012";
        var log = new[]
        {
            PlayerAction.UnfastenPanel(1, NotePanel.Id, Tool.None),                     // looking: ignored
            PlayerAction.UnfastenPanel(2, _bomb.CoverOf(Keypad.Id)!.Id, Tool.Wrench),   // open the keypad's bay
            PlayerAction.EnterCode(3, Keypad.Id, wrongCode),
        };

        var result = ReplayMapper.Replay(_bomb, log);

        Assert.Equal([ActionResult.Ignored, ActionResult.Ok, ActionResult.Strike], result.Results);
        Assert.Equal(1, result.Strikes);
    }

    [Fact]
    public void ReplayRequest_DeserialisesClientJson()
    {
        const string body = """
            { "actions": [
                { "t": 1200, "tool": "wireCutters", "moduleId": 0, "target": "wire:2" },
                { "t": 1500, "tool": "none", "moduleId": 3, "target": "combo:10-3" } ] }
            """;

        var request = JsonSerializer.Deserialize<ReplayRequest>(body, PuzzleMapper.JsonOptions);

        Assert.Equal(
            [PlayerAction.CutWire(1200, 0, 2), PlayerAction.EnterCombo(1500, 3, new SafeCombo(10, 3))],
            request!.Actions!);
    }

    [Fact]
    public void ReplayResult_SerialisesEnumsAsCamelCaseStrings()
    {
        var bomb = GameSessionTests.DayWhere(b => b.PanelHiding(Tool.WireCutters) is not null);
        var log = new[] { PlayerAction.UnfastenPanel(1, bomb.PanelHiding(Tool.WireCutters)!.Id, Tool.Wrench) };

        string json = JsonSerializer.Serialize(ReplayMapper.Replay(bomb, log), PuzzleMapper.JsonOptions);

        Assert.Contains("\"outcome\":\"inProgress\"", json);
        Assert.Contains("\"tool\":\"wireCutters\"", json);
    }

    [Fact]
    public void ReplayResult_RevealedModulesCarryTheirType()
    {
        var log = _bomb.Modules.OfType<SecretPanelModule>().Select(p => PlayerAction.UnfastenPanel(1, p.Id, Tool.Wrench));

        string json = JsonSerializer.Serialize(ReplayMapper.Replay(_bomb, log), PuzzleMapper.JsonOptions);

        Assert.Contains("\"type\":\"wireSet\"", json);
        Assert.Contains("\"type\":\"keypad\"", json);
        Assert.Contains("\"type\":\"safe\"", json);
    }
}
