// Bombdle console runner
// prints one day's puzzle so the generator can be inspected without a browser.
// dotnet run --project Bombdle.Cli -- [yyyy-MM-dd] [--json] [--solution]
//
// (no date)    today's puzzle (UTC)
// --json       the exact JSON the client receives, instead of the readable view
// --solution   also print the secret answer 

using Bombdle.Core.Api;
using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Generation;
using Bombdle.Core.Random;

string? dateArg = args.FirstOrDefault(a => !a.StartsWith("--", StringComparison.Ordinal));
DateOnly date = DateOnly.FromDateTime(DateTime.UtcNow);
if (dateArg is not null && !DateSeed.TryParseKey(dateArg, out date))
{
    Console.Error.WriteLine($"Invalid date '{dateArg}'. Expected {DateSeed.Format}.");
    return 1;
}

var bomb = new PuzzleGenerator().Generate(date);

if (args.Contains("--json"))
    Console.WriteLine(PuzzleMapper.ToJson(bomb, indented: true));
else
    PrintReadable(bomb);

if (args.Contains("--solution"))
    PrintSolution(bomb);

return 0;

static void PrintReadable(Bomb bomb)
{
    Console.WriteLine($"BOMBDLE {DateSeed.ToKey(bomb.Date)}   shape={bomb.Shape.Id}   seed={bomb.Seed}");
    var startingTools = Enum.GetValues<Tool>().Where(t => t != Tool.None && bomb.PanelHiding(t) is null);
    Console.WriteLine($"toolbox: {string.Join(", ", startingTools)}");
    var mix = bomb.Modules.OfType<PuzzleModule>().GroupBy(Noun).Select(g => g.Count() == 1 ? $"1 {g.Key}" : $"{g.Count()} {g.Key}s");
    Console.WriteLine($"modules: {string.Join(", ", mix)}");

    foreach (var face in bomb.Faces)
    {
        Console.WriteLine();
        Console.WriteLine($"[{face.Name}]");

        var panel = face.Modules.OfType<SecretPanelModule>().SingleOrDefault();
        if (panel is null)
        {
            Console.WriteLine("  plain panel (no bolts, nothing behind it)");
        }
        else
        {
            string tool = panel.HiddenTool is { } hidden ? $", hiding the {hidden}" : "";
            Console.WriteLine($"  PANEL held by {panel.Fastener.ToString().ToLowerInvariant()}s{tool}");
            foreach (int id in panel.ContentIds)
                Console.WriteLine($"    {Describe(face.Modules.Single(m => m.Id == id))}");
        }

        foreach (var scribble in face.Modules.OfType<ClueModule>().Where(c => bomb.CoverOf(c.Id) is null))
            Console.WriteLine($"  SCRIBBLE: {scribble.Clue.Text}");
    }
}

static string Describe(Module module) => module switch
{
    WireSetModule set => $"{Name(set)}: " +
        string.Join(", ", set.Wires.Select(w => $"{w.Position + 1}={w.Color} (tilt {w.TiltDegrees:+0;-0;0})")),
    KeypadModule keypad => $"{Name(keypad)} ({keypad.CodeLength} different digits)",
    SafeModule safe => $"{Name(safe)} (dial 1-{safe.DialSize}: left number, then right number, always different)",
    ClueModule clue => $"note: {clue.Clue.Text}",
    _ => module.GetType().Name,
};

static string Name(PuzzleModule module) =>
    module.Label is null ? Kind(module).ToUpperInvariant() : $"{Kind(module).ToUpperInvariant()} {module.Label}";

static string Kind(PuzzleModule module) => module switch
{
    WireSetModule => "wires",
    KeypadModule => "keypad",
    _ => "safe",
};

static string Noun(PuzzleModule module) => module is WireSetModule ? "wire panel" : Kind(module);

static void PrintSolution(Bomb bomb)
{
    Console.WriteLine();
    Console.WriteLine("SOLUTION (debug only)");
    foreach (var set in bomb.Modules.OfType<WireSetModule>())
    {
        var cut = set.Wires.Where(w => bomb.Solution.MustCut(set.Id, w.Position)).Select(w => w.Color);
        Console.WriteLine($"  {Name(set)}: cut {string.Join(", ", cut)}");
    }
    foreach (var keypad in bomb.Modules.OfType<KeypadModule>())
        Console.WriteLine($"  {Name(keypad)}: {bomb.Solution.KeypadCodes[keypad.Id]}");
    foreach (var safe in bomb.Modules.OfType<SafeModule>())
        Console.WriteLine($"  {Name(safe)}: {bomb.Solution.SafeCombos[safe.Id]}");
    foreach (var panel in bomb.Modules.OfType<SecretPanelModule>())
        Console.WriteLine($"  {bomb.Faces[panel.FaceId].Name} panel: use the {panel.Fastener.RequiredTool()}");
}
