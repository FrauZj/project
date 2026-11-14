namespace Bombdle.Core.Api;

using System.Text.Json.Serialization;
using Bombdle.Core.Domain;

// What the client receives. 
public sealed record PuzzleDto(
    string Date,
    uint Seed,
    string ShapeId,
    int MaxStrikes,
    IReadOnlyList<Tool> StartingTools,
    IReadOnlyList<FaceDto> Faces);

public sealed record FaceDto(int Id, string Name, IReadOnlyList<SlotDto> Slots, IReadOnlyList<ModuleDto> Modules);

public sealed record SlotDto(double X, double Y, double Width, double Height);

/// <summary>
/// Polymorphic module, so the client can pick the matching JS module class.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(WireSetDto), "wireSet")]
[JsonDerivedType(typeof(KeypadDto), "keypad")]
[JsonDerivedType(typeof(SafeDto), "safe")]
[JsonDerivedType(typeof(SecretPanelDto), "secretPanel")]
[JsonDerivedType(typeof(ClueDto), "clue")]
public abstract record ModuleDto(int Id, int SlotIndex);

/// <param name="Label">when the bomb has two wire panels</param>
public sealed record WireSetDto(int Id, int SlotIndex, string? Label, IReadOnlyList<WireDto> Wires)
    : ModuleDto(Id, SlotIndex);

/// <param name="Tilt">How many degrees the wire and its connectors are turned.</param>
public sealed record WireDto(int Position, string Color, int Tilt);

/// <param name="Label">when the bomb has two keypads</param>
public sealed record KeypadDto(int Id, int SlotIndex, string? Label, int CodeLength, bool DistinctDigits)
    : ModuleDto(Id, SlotIndex);

/// <param name="Label">when the bomb has two safes</param>
public sealed record SafeDto(int Id, int SlotIndex, string? Label, int DialSize, bool DistinctNumbers)
    : ModuleDto(Id, SlotIndex);

/// <summary>A bolted panel. </summary>
public sealed record SecretPanelDto(int Id, int SlotIndex, string Fastener) : ModuleDto(Id, SlotIndex);

/// <summary>A clue scribbled on the outside of the bomb.</summary>
public sealed record ClueDto(int Id, int SlotIndex, string Text) : ModuleDto(Id, SlotIndex);
