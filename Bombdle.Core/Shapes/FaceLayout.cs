namespace Bombdle.Core.Shapes;

public sealed record SlotRect(double X, double Y, double Width, double Height);

public enum FaceRole
{
    Bay,      // module 
    Cover,    // cover
}

public sealed record FaceLayout(int Id, string Name, FaceRole Role, IReadOnlyList<SlotRect> Slots);
