namespace Bombdle.Core.Domain.Modules;

/// <summary>
/// A bolted panel with a module bay on a side, a bolted empty side, or a bolted
/// cover on the top or bottom. 
/// </summary>
public sealed class SecretPanelModule(int id, FastenerType fastener, IReadOnlyList<int> contentIds, Tool? hiddenTool)
    : Module(id)
{
    public FastenerType Fastener { get; } = fastener;

    public IReadOnlyList<int> ContentIds { get; } = contentIds;

    public Tool? HiddenTool { get; } = hiddenTool;
}
