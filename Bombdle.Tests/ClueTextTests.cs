namespace Bombdle.Tests;

using Bombdle.Core.Clues;
using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;

public class ClueTextTests
{
    private static readonly Wire Red = new(0, "red", 0);
    private static readonly Wire Blue = new(1, "blue", 0);

    [Fact]
    public void Text_IsTheCapitalisedStatement()
    {
        Assert.Equal("Cut the red wire.", new WireColorFate(Red, Cut: true).Text);
        Assert.Equal("The digits add up to 9.", new KeyDigitSum(9).Text);
        Assert.Equal("The two numbers add up to 13.", new SafeSum(13).Text);
    }

    [Fact]
    public void TrueClues_NeverNameTheModule()
    {
        var set = new WireSetModule(0, "B", [Red, Blue]);
        Clue[] clues =
        [
            .. ClueFactories.TrueWireClues(set, cutMask: 0b01),
            .. ClueFactories.TrueKeypadClues("471"),
            .. ClueFactories.TrueSafeClues(new SafeCombo(10, 3)),
        ];

        Assert.All(clues, clue =>
        {
            Assert.DoesNotContain(":", clue.Text);
            Assert.True(char.IsUpper(clue.Text[0]) || char.IsDigit(clue.Text[0]), clue.Text);
        });
    }
}
