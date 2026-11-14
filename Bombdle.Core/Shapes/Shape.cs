namespace Bombdle.Core.Shapes;

public abstract class Shape
{
    public abstract string Id { get; }

    public abstract IReadOnlyList<FaceLayout> Faces { get; }

    public IEnumerable<FaceLayout> FacesFor(FaceRole role) => Faces.Where(f => f.Role == role);
}
