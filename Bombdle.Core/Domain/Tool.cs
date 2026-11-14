namespace Bombdle.Core.Domain;

public enum Tool
{
    None = 0,
    Wrench = 1,
    WireCutters = 2,
}

public enum FastenerType
{
    Bolt,
}

public static class FastenerTypeExtensions
{
    public static Tool RequiredTool(this FastenerType fastener) => fastener switch
    {
        FastenerType.Bolt => Tool.Wrench,
        _ => throw new ArgumentOutOfRangeException(nameof(fastener), fastener, null),
    };
}
