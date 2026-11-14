namespace Bombdle.Core.Shapes;

public sealed class CubeShape : Shape
{
    // Face ids and names must match js/shapes/cube.js.
    private static readonly (string Name, FaceRole Role)[] FaceSpecs =
    [
        ("front", FaceRole.Bay),
        ("back", FaceRole.Bay),
        ("right", FaceRole.Bay),
        ("left", FaceRole.Bay),
        ("top", FaceRole.Cover),
        ("bottom", FaceRole.Cover),
    ];

    private static readonly SlotRect[] WholeFace = [new(0.0, 0.0, 1.0, 1.0)];

    public override string Id => "cube";

    public override IReadOnlyList<FaceLayout> Faces { get; } =
        FaceSpecs.Select((face, id) => new FaceLayout(id, face.Name, face.Role, WholeFace)).ToArray();
}
