namespace Bombdle.Tests;

using Bombdle.Core.Random;

public class Mulberry32Tests
{
    // Expected values were produced by the canonical Mulberry32
    [Theory]
    [InlineData(0u, 1144304738u, 1416247u, 958946056u)]
    [InlineData(12345u, 4207900869u, 1317490944u, 2079646450u)]
    public void NextUInt_MatchesJavaScriptReference(uint seed, uint first, uint second, uint third)
    {
        var rng = new Mulberry32(seed);

        Assert.Equal([first, second, third], new[] { rng.NextUInt(), rng.NextUInt(), rng.NextUInt() });
    }

    [Fact]
    public void DateSeed_MatchesJavaScriptReference()
    {
        Assert.Equal(3497510848u, DateSeed.FromDate(new DateOnly(2026, 10, 28)));
    }

    [Fact]
    public void NextInt_StaysInRange()
    {
        var rng = new Mulberry32(42);
        for (int i = 0; i < 10_000; i++)
            Assert.InRange(rng.NextInt(3, 7), 3, 6);
    }

    [Fact]
    public void Shuffle_SameSeed_SameOrder()
    {
        var a = Enumerable.Range(0, 20).ToList();
        var b = Enumerable.Range(0, 20).ToList();

        new Mulberry32(7).Shuffle(a);
        new Mulberry32(7).Shuffle(b);

        Assert.Equal(a, b);
        Assert.NotEqual(Enumerable.Range(0, 20), a);
    }
}
