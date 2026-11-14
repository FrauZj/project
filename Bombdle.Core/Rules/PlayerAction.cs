namespace Bombdle.Core.Rules;

using Bombdle.Core.Domain;

/// <param name="T">Milliseconds since the player started the puzzle.</param>
/// <param name="Tool">Tool in hand when clicking</param>
/// <param name="ModuleId">Module that was clicked.</param>
/// <param name="Target">Part of the module</param>
public sealed record PlayerAction(long T, Tool Tool, int ModuleId, string Target)
{
    public const string PanelTarget = "panel";
    public const string WirePrefix = "wire:";
    public const string CodePrefix = "code:";
    public const string ComboPrefix = "combo:";

    public static PlayerAction CutWire(long t, int moduleId, int position, Tool tool = Tool.WireCutters) =>
        new(t, tool, moduleId, WirePrefix + position);

    public static PlayerAction UnfastenPanel(long t, int moduleId, Tool tool) =>
        new(t, tool, moduleId, PanelTarget);

    public static PlayerAction EnterCode(long t, int moduleId, string code) =>
        new(t, Tool.None, moduleId, CodePrefix + code);

    public static PlayerAction EnterCombo(long t, int moduleId, SafeCombo combo) =>
        new(t, Tool.None, moduleId, ComboPrefix + combo);
}
