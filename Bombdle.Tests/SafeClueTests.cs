namespace Bombdle.Tests;

using Bombdle.Core.Clues;
using Bombdle.Core.Domain;

/// <summary>Each safe clue kind against one combination, plus the parser the rules engine relies on.</summary>
public class SafeClueTests
{
    private static readonly SafeCombo Combo = new(12, 4);

    public static TheoryData<SafeClue, bool> Cases => new()
    {
        { new SafeNumberIs(DialTurn.Left, 12), true },
        { new SafeNumberIs(DialTurn.Right, 12), false },
        { new SafeNumberParity(DialTurn.Right, Even: true), true },
        { new SafeNumberAbove(DialTurn.Left, 10, Above: true), true },
        { new SafeNumberAbove(DialTurn.Right, 10, Above: true), false },
        { new SafeMultipleOfFive(DialTurn.Left, IsMultiple: false), true },
        { new SafeSum(16), true },
        { new SafeSum(15), false },
        { new SafeApart(8), true },
        { new SafeOrder(LeftIsLarger: true), true },
        { new SafeOddCount(0), true },
        { new SafeMultipleOfOther(DialTurn.Left), true },    // 12 is a multiple of 4
        { new SafeMultipleOfOther(DialTurn.Right), false },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Holds_ForTwelveThenFour(SafeClue clue, bool expected)
    {
        Assert.Equal(expected, clue.Holds(Combo));
    }

    [Fact]
    public void TrueSafeClues_AreAllTrueAndTogetherPinTheAnswer()
    {
        var clues = ClueFactories.TrueSafeClues(Combo).ToList();

        Assert.All(clues, clue => Assert.True(clue.Holds(Combo), clue.Text));
        Assert.Equal([Combo], ClueSolver.Solutions(CandidateSpace.SafeCombos(25), clues));
    }

    [Fact]
    public void TrueSafeClues_UseSafeVocabularyOnly()
    {
        // Safe clues must never read like keypad clues ("digit", "code", "place").
        Assert.All(ClueFactories.TrueSafeClues(Combo), clue =>
        {
            Assert.StartsWith("Safe: ", clue.Text);
            Assert.DoesNotContain("digit", clue.Text);
            Assert.DoesNotContain("code", clue.Text);
            Assert.DoesNotContain("place", clue.Text);
        });
    }

    [Fact]
    public void CandidateSpace_HasEveryOrderedPairOfDifferentNumbers()
    {
        var combos = CandidateSpace.SafeCombos(25);

        Assert.Equal(25 * 24, combos.Count);
        Assert.DoesNotContain(combos, c => c.Left == c.Right);
    }

    [Theory]
    [InlineData("10-3", true, 10, 3)]
    [InlineData("25-1", true, 25, 1)]
    [InlineData("0-3", false, 0, 0)]
    [InlineData("26-3", false, 0, 0)]
    [InlineData("10", false, 0, 0)]
    [InlineData("-1-3", false, 0, 0)]
    [InlineData("10- 3", false, 0, 0)]
    public void TryParse_AcceptsOnlyTwoDialNumbers(string text, bool ok, int left, int right)
    {
        Assert.Equal(ok, SafeCombo.TryParse(text, 25, out var combo));
        if (ok) Assert.Equal(new SafeCombo(left, right), combo);
    }

    [Fact]
    public void ToString_IsLeftDashRight()
    {
        Assert.Equal("10-3", new SafeCombo(10, 3).ToString());
    }
}
