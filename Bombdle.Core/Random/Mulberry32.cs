namespace Bombdle.Core.Random;

/// <summary>
/// Deterministic 32-bit PRNG
/// </summary>
public sealed class Mulberry32
{
    private uint _state;

    public Mulberry32(uint seed) => _state = seed;

    public uint NextUInt()
    {
        _state += 0x6D2B79F5u;
        uint z = _state;
        z = (z ^ (z >> 15)) * (z | 1u);
        z ^= z + (z ^ (z >> 7)) * (z | 61u);
        return z ^ (z >> 14);
    }

    // maxExclusive / 2^32 (under 0.000001% for our ranges), which is irrelevant for the game
    public int NextInt(int maxExclusive)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(maxExclusive);
        return (int)(NextUInt() % (uint)maxExclusive);
    }

    public int NextInt(int minInclusive, int maxExclusive) =>
        minInclusive + NextInt(maxExclusive - minInclusive);

    public bool NextBool() => NextInt(2) == 0;

    public T Pick<T>(IReadOnlyList<T> items)
    {
        if (items.Count == 0)
            throw new ArgumentException("Cannot pick from an empty list.", nameof(items));
        return items[NextInt(items.Count)];
    }

    public void Shuffle<T>(IList<T> items)
    {
        for (int i = items.Count - 1; i > 0; i--)
        {
            int j = NextInt(i + 1);
            (items[i], items[j]) = (items[j], items[i]);
        }
    }
}
