namespace Bombdle.Core.Api;

using System.Text.Json;
using System.Text.Json.Serialization;
using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Random;
using Bombdle.Core.Rules;

/// <summary>Turns a <see cref="Bomb"/> into what the client may see.</summary>
public static class PuzzleMapper
{
    public static readonly JsonStringEnumConverter EnumConverter = new(JsonNamingPolicy.CamelCase);
    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { EnumConverter } };

    public static PuzzleDto ToDto(Bomb bomb) => new(
        Date: DateSeed.ToKey(bomb.Date),
        Seed: bomb.Seed,
        ShapeId: bomb.Shape.Id,
        MaxStrikes: GameSession.MaxStrikes,
        StartingTools: Enum.GetValues<Tool>().Where(t => t != Tool.None && bomb.PanelHiding(t) is null).ToArray(),
        Faces: bomb.Faces.Select(face => new FaceDto(
            face.Id,
            face.Name,
            face.Layout.Slots.Select(s => new SlotDto(s.X, s.Y, s.Width, s.Height)).ToArray(),
            face.Modules.Where(m => bomb.CoverOf(m.Id) is null).Select(ToDto).ToArray())).ToArray());

    internal static ModuleDto ToDto(Module module) => module switch
    {
        WireSetModule set => new WireSetDto(set.Id, set.SlotIndex, set.Label,
            set.Wires.Select(w => new WireDto(w.Position, w.Color, w.TiltDegrees)).ToArray()),

        KeypadModule keypad => new KeypadDto(keypad.Id, keypad.SlotIndex, keypad.Label, keypad.CodeLength, KeypadModule.DistinctDigits),

        SafeModule safe => new SafeDto(safe.Id, safe.SlotIndex, safe.Label, safe.DialSize, SafeModule.DistinctNumbers),

        SecretPanelModule panel => new SecretPanelDto(panel.Id, panel.SlotIndex, panel.Fastener.ToString().ToLowerInvariant()),

        ClueModule clue => new ClueDto(clue.Id, clue.SlotIndex, clue.Clue.Text),

        _ => throw new NotSupportedException($"No DTO for module type {module.GetType().Name}."),
    };

    public static string ToJson(Bomb bomb, bool indented = false) =>
        JsonSerializer.Serialize(ToDto(bomb),
            indented ? new JsonSerializerOptions(JsonOptions) { WriteIndented = true } : JsonOptions);
}
