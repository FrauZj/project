namespace Bombdle.Core.Domain.Modules;

/// <summary>
/// Base for everything that sits in a face slot.
/// </summary>
public abstract class Module
{
    protected Module(int id) => Id = id;

    public int Id { get; }

    public int FaceId { get; private set; } = -1;

    public int SlotIndex { get; private set; } = -1;

    internal void PlaceAt(int faceId, int slotIndex)
    {
        FaceId = faceId;
        SlotIndex = slotIndex;
    }
}
