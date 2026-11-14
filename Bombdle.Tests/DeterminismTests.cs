namespace Bombdle.Tests;

using System.Security.Cryptography;
using System.Text;
using Bombdle.Core.Api;
using Bombdle.Core.Generation;

public class DeterminismTests
{
    private static readonly DateOnly Day = new(2026, 10, 28);

    private static string Json(DateOnly date) => PuzzleMapper.ToJson(new PuzzleGenerator().Generate(date));

    [Fact]
    public void Generate_SameDate_IdenticalPuzzle()
    {
        Assert.Equal(Json(Day), Json(Day));
    }

    [Fact]
    public void Generate_DifferentDates_DifferentPuzzles()
    {
        Assert.NotEqual(Json(Day), Json(Day.AddDays(1)));
    }

    [Fact]
    public void Generate_KnownDate_MatchesSnapshot()
    {
        string hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Json(Day))));

        Assert.Equal(Snapshot, hash);
    }

    // The M4c generator. Re-pinned on 2026-11-09
    private const string Snapshot = "ED2C92F0BB1BDBD4E91DA581F21B935EFCCCB02F863FD4254CB072BEC355D5CE";
}
