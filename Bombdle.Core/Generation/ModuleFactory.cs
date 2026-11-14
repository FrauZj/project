namespace Bombdle.Core.Generation;

using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Random;

/// <summary>
/// Creates the modules together with their secret answers.
/// </summary>
internal static class ModuleFactory
{
    public const int KeypadCodeLength = 3;
    public const int SafeDialSize = 25;

    public const int MaxWireTilt = 10;
    public const int MaxNeighbourTilt = 12;

    private static readonly string[] WireColors = ["red", "blue", "green", "yellow", "white", "black"];

    /// <summary>A panel of 4–5 wires with unique colours.
    /// At least one wire is cut, but never all of them.</summary>
    public static (WireSetModule Set, int CutMask) CreateWireSet(Mulberry32 rng, int id, string? label)
    {
        int wireCount = rng.NextInt(4, 6);

        var colors = WireColors.ToList();
        rng.Shuffle(colors);

        var positions = Enumerable.Range(0, wireCount).ToList();
        rng.Shuffle(positions);
        int cutCount = rng.NextInt(1, wireCount);
        int cutMask = positions.Take(cutCount).Aggregate(0, (mask, p) => mask | (1 << p));

        var tilts = new int[wireCount];
        for (int p = 0; p < wireCount; p++)
        {
            int low = p == 0 ? -MaxWireTilt : Math.Max(-MaxWireTilt, tilts[p - 1] - MaxNeighbourTilt);
            int high = p == 0 ? MaxWireTilt : Math.Min(MaxWireTilt, tilts[p - 1] + MaxNeighbourTilt);
            tilts[p] = rng.NextInt(low, high + 1);
        }

        var wires = Enumerable.Range(0, wireCount).Select(p => new Wire(p, colors[p], tilts[p])).ToArray();
        return (new WireSetModule(id, label, wires), cutMask);
    }

    /// <summary>A keypad and a code of distinct digits.</summary>
    public static (KeypadModule Keypad, string Code) CreateKeypad(Mulberry32 rng, int id, string? label)
    {
        var digits = "0123456789".ToList();
        rng.Shuffle(digits);
        string code = new(digits.Take(KeypadCodeLength).ToArray());

        return (new KeypadModule(id, label, KeypadCodeLength), code);
    }

    /// <summary>A safe and its combination
    /// from 1 to 25, two numbers</summary>
    public static (SafeModule Safe, SafeCombo Combo) CreateSafe(Mulberry32 rng, int id, string? label)
    {
        var numbers = Enumerable.Range(1, SafeDialSize).ToList();
        rng.Shuffle(numbers);

        return (new SafeModule(id, label, SafeDialSize), new SafeCombo(numbers[0], numbers[1]));
    }
}
