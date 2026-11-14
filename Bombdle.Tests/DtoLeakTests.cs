namespace Bombdle.Tests;

using Bombdle.Core.Api;
using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Generation;

/// <summary>
/// The client must never receive an answer, anything still inside a bolted panel (a note, a bay's
/// module), or where a tool hides.
/// </summary>
public class DtoLeakTests
{
    [Theory]
    [InlineData(2026, 10, 28)]
    [InlineData(2027, 1, 1)]
    [InlineData(2028, 2, 29)]
    public void ToJson_ContainsNoSecrets(int year, int month, int day)
    {
        var bomb = new PuzzleGenerator().Generate(new DateOnly(year, month, day));
        string json = PuzzleMapper.ToJson(bomb);

        var notes = bomb.Modules.OfType<ClueModule>().Where(c => bomb.CoverOf(c.Id) is not null).ToList();

        Assert.NotEmpty(notes);
        Assert.All(bomb.Solution.KeypadCodes.Values, code => Assert.DoesNotContain($"\"{code}\"", json));
        Assert.All(bomb.Solution.SafeCombos.Values, combo => Assert.DoesNotContain($"\"{combo}\"", json));
        Assert.All(notes, note => Assert.DoesNotContain(note.Clue.Text, json));
        Assert.DoesNotContain("solution", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("mask", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("covered", json, StringComparison.OrdinalIgnoreCase);   // no list of a panel's contents
        Assert.DoesNotContain("contentIds", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("hidden", json, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(2026, 10, 28)]
    [InlineData(2027, 1, 1)]
    [InlineData(2028, 2, 29)]
    public void ToJson_ModulesInClosedBays_AreNotSent(int year, int month, int day)
    {
        var bomb = new PuzzleGenerator().Generate(new DateOnly(year, month, day));
        string json = PuzzleMapper.ToJson(bomb);

        // Every module sits in a bay, so the puzzle names none of them: not their kind, letter or wires.
        Assert.NotEmpty(bomb.Modules.OfType<PuzzleModule>());
        Assert.DoesNotContain("\"type\":\"wireSet\"", json);
        Assert.DoesNotContain("\"type\":\"keypad\"", json);
        Assert.DoesNotContain("\"type\":\"safe\"", json);
        Assert.DoesNotContain("\"label\"", json);
        Assert.DoesNotContain("\"wires\"", json);
    }

    [Fact]
    public void ToJson_HiddenCutters_AreMissingFromTheToolboxAndNamedNowhere()
    {
        var bomb = GameSessionTests.DayWhere(b => b.PanelHiding(Tool.WireCutters) is not null);

        string json = PuzzleMapper.ToJson(bomb);

        Assert.DoesNotContain("wireCutters", json);
        Assert.Contains("\"startingTools\":[\"screwdriver\",\"wrench\"]", json);
    }

    [Fact]
    public void ToJson_ModulesCarryTypeDiscriminator()
    {
        string json = PuzzleMapper.ToJson(GameSessionTests.AllKinds);

        Assert.Contains("\"type\":\"secretPanel\"", json);
        Assert.Contains("\"type\":\"clue\"", json);
    }
}
