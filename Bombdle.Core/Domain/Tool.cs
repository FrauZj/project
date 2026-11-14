namespace Bombdle.Core.Domain;

public enum Tool
{
    None = 0,
    Screwdriver = 1,
    Wrench = 2,
    WireCutters = 3,
}

public enum FastenerType
{
    Screw, // TODO: remove
    Bolt,
}

public static class FastenerTypeExtensions
{
    public static Tool RequiredTool(this FastenerType fastener) => fastener switch
    {
        FastenerType.Screw => Tool.Screwdriver,
        FastenerType.Bolt => Tool.Wrench,
        _ => throw new ArgumentOutOfRangeException(nameof(fastener), fastener, null),
    };
}
