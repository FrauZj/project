namespace Bombdle.Core.Domain;

using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Shapes;

public sealed class Bomb(DateOnly date, uint seed, Shape shape, IReadOnlyList<Face> faces, Solution solution)
{
    public DateOnly Date { get; } = date;
    public uint Seed { get; } = seed;
    public Shape Shape { get; } = shape;
    public IReadOnlyList<Face> Faces { get; } = faces;
    public Solution Solution { get; } = solution;
    public IEnumerable<Module> Modules => Faces.SelectMany(f => f.Modules);

    public SecretPanelModule? CoverOf(int moduleId) =>
        Modules.OfType<SecretPanelModule>().FirstOrDefault(p => p.ContentIds.Contains(moduleId));
        
    public SecretPanelModule? PanelHiding(Tool tool) =>
        Modules.OfType<SecretPanelModule>().FirstOrDefault(p => p.HiddenTool == tool);
}
