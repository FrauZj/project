namespace Bombdle.Core.Api;

using Bombdle.Core.Domain;
using Bombdle.Core.Rules;

/// <summary>
/// Body of POST /api/puzzle/{date}/replay.
/// </summary>
public sealed record ReplayRequest(IReadOnlyList<PlayerAction>? Actions);

/// <param name="Results">One verdict per submitted action, in order (ok / strike / ignored).</param>
/// <param name="Revealed">Notes inside panels that have been removed</param>
/// <param name="FoundTools">Tools that were hidden in panels</param>
/// <param name="RevealedModules">Modules in bays</param>
public sealed record ReplayResultDto(
    IReadOnlyList<ActionResult> Results,
    int Strikes,
    int MaxStrikes,
    Outcome Outcome,
    int ActionCount,
    long ElapsedMs,
    IReadOnlyList<RevealedClueDto> Revealed,
    IReadOnlyList<FoundToolDto> FoundTools,
    IReadOnlyList<RevealedModuleDto> RevealedModules);
public sealed record RevealedClueDto(int ModuleId, int PanelId, string Text);
public sealed record FoundToolDto(Tool Tool, int PanelId);
public sealed record RevealedModuleDto(int PanelId, ModuleDto Module);
