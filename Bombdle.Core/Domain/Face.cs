namespace Bombdle.Core.Domain;

using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Shapes;

public sealed class Face(FaceLayout layout, IReadOnlyList<Module> modules)
{
    public int Id => Layout.Id;

    public string Name => Layout.Name;

    public FaceLayout Layout { get; } = layout;

    public IReadOnlyList<Module> Modules { get; } = modules;
}
