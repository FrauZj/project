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

    // The M4c generator. Re-pinned on 2026-11-14
    private const string Snapshot = "5827455E394C9447CEB706948BE7C0D80F5EEE29CD038C2E4FE18E24ADD38629";
}
