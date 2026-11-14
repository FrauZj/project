namespace Bombdle.Tests;

using Bombdle.Core.Clues;
using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;

/// <summary>Every clue starts with its module's name, plus the letter when the bomb has two of that kind.</summary>
public class ClueTextTests
{
    private static readonly Wire Red = new(0, "red", 0);
    private static readonly Wire Blue = new(1, "blue", 0);

    [Fact]
    public void Text_OnlyModuleOfItsKind_HasNoLetter()
    {
        Assert.Equal("Wires: cut the red wire.", new WireColorFate(Red, Cut: true).Text);
        Assert.Equal("Keypad: the digits add up to 9.", new KeyDigitSum(9).Text);
        Assert.Equal("Safe: the two numbers add up to 13.", new SafeSum(13).Text);
    }

    [Fact]
    public void Text_WithALetter_NamesTheModule()
    {
        Assert.Equal("Wires B: cut the red wire.", new WireColorFate(Red, Cut: true) { Label = "B" }.Text);
        Assert.Equal("Keypad A: the digits add up to 9.", new KeyDigitSum(9) { Label = "A" }.Text);
        Assert.Equal("Safe B: the two numbers add up to 13.", new SafeSum(13) { Label = "B" }.Text);
    }

    [Fact]
    public void TrueClues_CarryTheirModulesLetter()
    {
        var set = new WireSetModule(0, "B", [Red, Blue]);

        Assert.All(ClueFactories.TrueWireClues(set, cutMask: 0b01), clue => Assert.StartsWith("Wires B: ", clue.Text));
        Assert.All(ClueFactories.TrueKeypadClues("471", "A"), clue => Assert.StartsWith("Keypad A: ", clue.Text));
        Assert.All(ClueFactories.TrueSafeClues(new SafeCombo(10, 3), "B"), clue => Assert.StartsWith("Safe B: ", clue.Text));
        Assert.All(ClueFactories.TrueKeypadClues("471"), clue => Assert.StartsWith("Keypad: ", clue.Text));
    }
}
