namespace Bombdle.Tests;

using Bombdle.Core.Clues;
using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Generation;
using Bombdle.Core.Shapes;
using Xunit.Abstractions;

/// <summary>
/// Property tests over 1000 consecutive daily puzzles
/// </summary>
public class GeneratorPropertyTests(ITestOutputHelper output)
{
    private const int Days = 1000;

    [Fact]
    public void ThousandConsecutiveDays_AreFairAndUniquelySolvable()
    {
        var generator = new PuzzleGenerator();
        var start = new DateOnly(2026, 1, 1);
        int maxCards = 0, maxNotesInOnePanel = 0, hiddenCutterDays = 0, twoScribbleDays = 0, boltedEmptySides = 0;
        var moduleCounts = new int[5];
        var mixes = new Dictionary<string, int>();

        for (int day = 0; day < Days; day++)
        {
            var bomb = generator.Generate(start.AddDays(day));

            AssertMix(bomb);
            AssertStructure(bomb);
            foreach (var module in bomb.Modules)
                AssertFairModule(bomb, module);
            AssertEveryBoltedPanelIsNecessary(bomb);

            var puzzles = bomb.Modules.OfType<PuzzleModule>().ToList();
            var panels = bomb.Modules.OfType<SecretPanelModule>().ToList();
            moduleCounts[puzzles.Count]++;
            string mix = string.Join(" + ", puzzles.GroupBy(KindOf).OrderBy(g => g.Key).Select(g => $"{g.Count()} {g.Key}"));
            mixes[mix] = mixes.GetValueOrDefault(mix) + 1;
            maxCards = Math.Max(maxCards, bomb.Modules.OfType<ClueModule>().Count());
            maxNotesInOnePanel = Math.Max(maxNotesInOnePanel, panels.Max(p => p.ContentIds.Count(id => IsNote(bomb, id))));
            boltedEmptySides += panels.Count(p => bomb.Faces[p.FaceId].Layout.Role == FaceRole.Bay && !HoldsModule(bomb, p));
            hiddenCutterDays += bomb.PanelHiding(Tool.WireCutters) is not null ? 1 : 0;
            twoScribbleDays += bomb.Modules.OfType<ClueModule>().Count(c => bomb.CoverOf(c.Id) is null) == 2 ? 1 : 0;
        }

        output.WriteLine($"Days with 2 / 3 / 4 modules: {moduleCounts[2]} / {moduleCounts[3]} / {moduleCounts[4]} (of {Days})");
        output.WriteLine("Most common mixes: " + string.Join("; ", mixes.OrderByDescending(m => m.Value).Take(6).Select(m => $"{m.Key} x{m.Value}")));
        output.WriteLine($"Most clues on one bomb: {maxCards}; most notes in one panel: {maxNotesInOnePanel}");
        output.WriteLine($"Bolted empty sides: {boltedEmptySides}; days with hidden cutters: {hiddenCutterDays}; with 2 scribbles: {twoScribbleDays}");
    }

    /// <summary>
    /// The module mix test
    /// </summary>
    private static void AssertMix(Bomb bomb)
    {
        var modules = bomb.Modules.OfType<PuzzleModule>().ToList();
        Assert.InRange(modules.Count, 2, 4);

        var kinds = modules.GroupBy(KindOf).ToList();
        Assert.True(kinds.Count >= 2, $"{bomb.Date}: only one kind of module");
        foreach (var kind in kinds)
        {
            Assert.InRange(kind.Count(), 1, 2);
            var letters = kind.Select(m => m.Label).OrderBy(l => l).ToList();
            if (kind.Count() == 1)
                Assert.Null(letters[0]);
            else
                Assert.Equal(["A", "B"], letters);
        }
    }

    /// <summary>
    /// For one interactive module either:
    ///  - no contradictions
    ///  - exactly one solution
    /// </summary>
    private static void AssertFairModule(Bomb bomb, Module module)
    {
        switch (module)
        {
            case WireSetModule set:
                AssertFair(bomb, set.Id, CandidateSpace.WireMasks(set.Wires.Count), bomb.Solution.WireCutMasks[set.Id]);
                break;
            case KeypadModule keypad:
                AssertFair(bomb, keypad.Id, CandidateSpace.KeypadCodes(keypad.CodeLength), bomb.Solution.KeypadCodes[keypad.Id]);
                break;
            case SafeModule safe:
                AssertFair(bomb, safe.Id, CandidateSpace.SafeCombos(safe.DialSize), bomb.Solution.SafeCombos[safe.Id]);
                break;
        }
    }

    private static void AssertFair<T>(Bomb bomb, int moduleId, IReadOnlyList<T> candidates, T answer)
    {
        var clues = CluesAbout<T>(bomb, moduleId, except: null).ToList();

        Assert.All(clues, clue => Assert.True(clue.Holds(answer), $"{bomb.Date}: contradicting clue '{clue.Text}'"));
        Assert.Equal([answer], ClueSolver.Solutions(candidates, clues));
    }

    private static void AssertEveryBoltedPanelIsNecessary(Bomb bomb)
    {
        foreach (var panel in bomb.Modules.OfType<SecretPanelModule>())
        {
            if (HoldsModule(bomb, panel) || panel.HiddenTool is not null) continue;

            bool needed = bomb.Modules.Any(module => module switch
            {
                WireSetModule set => !ClueSolver.IsUnique(CandidateSpace.WireMasks(set.Wires.Count), CluesAbout<int>(bomb, set.Id, panel)),
                KeypadModule keypad => !ClueSolver.IsUnique(CandidateSpace.KeypadCodes(keypad.CodeLength), CluesAbout<string>(bomb, keypad.Id, panel)),
                SafeModule safe => !ClueSolver.IsUnique(CandidateSpace.SafeCombos(safe.DialSize), CluesAbout<SafeCombo>(bomb, safe.Id, panel)),
                _ => false,
            });

            Assert.True(needed, $"{bomb.Date}: the {bomb.Faces[panel.FaceId].Name} panel is not needed");
        }
    }

    private static IEnumerable<Clue<T>> CluesAbout<T>(Bomb bomb, int moduleId, SecretPanelModule? except) =>
        bomb.Modules.OfType<ClueModule>()
            .Where(c => c.TargetModuleId == moduleId && (except is null || !except.ContentIds.Contains(c.Id)))
            .Select(c => Assert.IsAssignableFrom<Clue<T>>(c.Clue));

    private static void AssertStructure(Bomb bomb)
    {
        var modules = bomb.Modules.ToList();

        foreach (var face in bomb.Faces)
        {
            Assert.All(face.Modules, m => Assert.InRange(m.SlotIndex, 0, face.Layout.Slots.Count - 1));
            var facePanels = face.Modules.OfType<SecretPanelModule>().ToList();
            var puzzles = face.Modules.OfType<PuzzleModule>().ToList();

            Assert.True(facePanels.Count <= 1, $"{bomb.Date}: {face.Name} has {facePanels.Count} panels");
            Assert.True(puzzles.Count <= (face.Layout.Role == FaceRole.Bay ? 1 : 0), $"{bomb.Date}: {face.Name} holds {puzzles.Count} modules");
            Assert.All(puzzles, module => Assert.Same(facePanels.Single(), bomb.CoverOf(module.Id)));
        }

        var panels = modules.OfType<SecretPanelModule>().ToList();
        Assert.True(panels.Count(p => p.HiddenTool is not null) <= 1);
        foreach (var panel in panels)
        {
            Assert.Equal(FastenerType.Bolt, panel.Fastener);
            Assert.True(panel.ContentIds.Count > 0 || panel.HiddenTool is not null, $"{bomb.Date}: a bolted panel with nothing inside");
            Assert.True(panel.ContentIds.Count(id => modules.Single(m => m.Id == id) is PuzzleModule) <= 1);
            foreach (int id in panel.ContentIds)
            {
                var inside = modules.Single(m => m.Id == id);
                Assert.True(inside is ClueModule or PuzzleModule, $"{bomb.Date}: a {inside.GetType().Name} inside a panel");
                Assert.Equal((panel.FaceId, panel.SlotIndex), (inside.FaceId, inside.SlotIndex));
            }
        }

        if (bomb.PanelHiding(Tool.WireCutters) is not null)
            Assert.NotEmpty(modules.OfType<WireSetModule>());

        var scribbles = modules.OfType<ClueModule>().Where(c => bomb.CoverOf(c.Id) is null).ToList();
        Assert.InRange(scribbles.Count, 1, 2);
        Assert.All(scribbles, s => Assert.NotNull(s.TargetModuleId));
        Assert.All(scribbles, s => Assert.Equal(FaceRole.Bay, bomb.Faces[s.FaceId].Layout.Role));
        Assert.Equal(scribbles.Count, scribbles.Select(s => s.FaceId).Distinct().Count());

        foreach (var clue in modules.OfType<ClueModule>().Where(c => c.TargetModuleId is not null))
        {
            var target = Assert.IsAssignableFrom<PuzzleModule>(modules.Single(m => m.Id == clue.TargetModuleId));
            Assert.StartsWith(NameOf(target) + ": ", clue.Clue.Text);
        }
    }

    private static bool IsNote(Bomb bomb, int id) => bomb.Modules.Single(m => m.Id == id) is ClueModule;

    private static bool HoldsModule(Bomb bomb, SecretPanelModule panel) =>
        panel.ContentIds.Any(id => bomb.Modules.Single(m => m.Id == id) is PuzzleModule);

    private static string KindOf(PuzzleModule module) => module switch
    {
        WireSetModule => "Wires",
        KeypadModule => "Keypad",
        _ => "Safe",
    };

    private static string NameOf(PuzzleModule module) =>
        module.Label is null ? KindOf(module) : $"{KindOf(module)} {module.Label}";
}
