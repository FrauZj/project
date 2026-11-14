namespace Bombdle.Core.Generation;

using Bombdle.Core.Clues;
using Bombdle.Core.Domain;
using Bombdle.Core.Domain.Modules;
using Bombdle.Core.Random;
using Bombdle.Core.Shapes;

/// <summary>
/// Generates the daily bomb 
/// </summary>
public sealed class PuzzleGenerator(Shape shape)
{
    private const int MaxAttempts = 100;
    private const int MaxFlavourCards = 2;
    private const int MinScribbles = 1;
    private const int MaxScribbles = 2;

    // Chances as "1 in N" 
    private const int EmptyCoverOneIn = 3;        
    private const int BoltedEmptySideOneIn = 2;  
    private const int HiddenCuttersOneIn = 2;     

    public PuzzleGenerator() : this(new CubeShape()) { }

    public Shape Shape { get; } = shape;

    public Bomb Generate(DateOnly date)
    {
        string key = DateSeed.ToKey(date);
        uint seed = DateSeed.FromDate(date);

        for (int attempt = 0; attempt < MaxAttempts; attempt++)
        {
            uint attemptSeed = attempt == 0 ? seed : DateSeed.Hash($"{key}#{attempt}");
            var bomb = TryGenerate(date, seed, new Mulberry32(attemptSeed));
            if (bomb is not null) return bomb;
        }

        throw new InvalidOperationException($"Could not fit a puzzle on shape '{Shape.Id}' for {key}.");
    }

    /// <summary>A clue that needs to be placed</summary>
    private sealed record PlannedCard(Clue Clue, int? TargetId, bool Essential);

    private sealed class BoltedPanel(FaceLayout face, PuzzleModule? module)
    {
        public FaceLayout Face { get; } = face;

        public PuzzleModule? Module { get; } = module;

        public List<PlannedCard> Notes { get; } = [];

        public bool HoldsCutters { get; set; }
    }

    private Bomb? TryGenerate(DateOnly date, uint seed, Mulberry32 rng)
    {
        var bayFaces = Shape.FacesFor(FaceRole.Bay).ToList();
        var coverFaces = Shape.FacesFor(FaceRole.Cover).ToList();
        if (bayFaces.Count < 2 || coverFaces.Count == 0)
            return null; // TODO: think about if we need this for the future or no

        int nextId = 0;

        var mix = ModuleMix.Roll(rng, bayFaces.Count);
        var letters = ModuleMix.Letters(mix);
        var wireMasks = new Dictionary<int, int>();
        var codes = new Dictionary<int, string>();
        var combos = new Dictionary<int, SafeCombo>();
        var bays = new List<BoltedPanel>();
        for (int bay = 0; bay < mix.Count; bay++)
        {
            PuzzleModule module;
            switch (mix[bay])
            {
                case null:
                    continue;  
                case ModuleKind.Wires:
                    var (set, mask) = ModuleFactory.CreateWireSet(rng, nextId++, letters[bay]);
                    wireMasks[set.Id] = mask;
                    module = set;
                    break;
                case ModuleKind.Keypad:
                    var (keypad, code) = ModuleFactory.CreateKeypad(rng, nextId++, letters[bay]);
                    codes[keypad.Id] = code;
                    module = keypad;
                    break;
                default:
                    var (safe, combo) = ModuleFactory.CreateSafe(rng, nextId++, letters[bay]);
                    combos[safe.Id] = combo;
                    module = safe;
                    break;
            }

            bays.Add(new BoltedPanel(bayFaces[bay], module));
        }

        var solution = new Solution(wireMasks, codes, combos);

        var cards = new List<PlannedCard>();
        foreach (var module in bays.Select(b => b.Module!))
        {
            cards.AddRange(module switch
            {
                WireSetModule set => PlanCards(set.Id, CandidateSpace.WireMasks(set.Wires.Count),
                    ClueFactories.TrueWireClues(set, wireMasks[set.Id]), rng),
                KeypadModule keypad => PlanCards(keypad.Id, CandidateSpace.KeypadCodes(keypad.CodeLength),
                    ClueFactories.TrueKeypadClues(codes[keypad.Id]), rng),
                SafeModule safe => PlanCards(safe.Id, CandidateSpace.SafeCombos(safe.DialSize),
                    ClueFactories.TrueSafeClues(combos[safe.Id]), rng),
                _ => throw new NotSupportedException($"No clues for module type {module.GetType().Name}."),
            });
        }

        var flavour = FlavourTexts.Lines.ToList();
        rng.Shuffle(flavour);
        cards.AddRange(flavour.Take(rng.NextInt(MaxFlavourCards + 1))
            .Select(line => new PlannedCard(new FlavourClue(line), null, Essential: false)));

        rng.Shuffle(coverFaces);
        int boltedCovers = coverFaces.Count > 1 && rng.NextInt(EmptyCoverOneIn) == 0
            ? coverFaces.Count - 1
            : coverFaces.Count;
        var noteCovers = coverFaces.Take(boltedCovers).Select(face => new BoltedPanel(face, null)).ToList();
        for (int bay = 0; bay < mix.Count; bay++)
        {
            if (mix[bay] is null && rng.NextInt(BoltedEmptySideOneIn) == 0)
                noteCovers.Add(new BoltedPanel(bayFaces[bay], null));
        }

        var bolted = bays.Concat(noteCovers).ToList();
        if (wireMasks.Count > 0 && rng.NextInt(HiddenCuttersOneIn) == 0)
            rng.Pick(bolted).HoldsCutters = true;

        rng.Shuffle(cards);
        var loose = new List<PlannedCard>(cards);
        foreach (var cover in noteCovers.Where(c => !c.HoldsCutters))
        {
            var anchor = loose.FirstOrDefault(c => c.Essential);
            if (anchor is null) return null;
            loose.Remove(anchor);
            cover.Notes.Add(anchor);
        }

        var scribbles = loose.Where(c => c.TargetId is not null)
            .Take(rng.NextInt(MinScribbles, MaxScribbles + 1))
            .ToList();
        if (scribbles.Count < MinScribbles) return null;
        foreach (var scribble in scribbles)
            loose.Remove(scribble);
        foreach (var card in loose)
            rng.Pick(bolted).Notes.Add(card);

        var placed = new List<Module>();
        void Place(Module module, FaceLayout face)
        {
            module.PlaceAt(face.Id, slotIndex: 0);   
            placed.Add(module);
        }

        foreach (var panel in bolted)
        {
            var contents = new List<int>();
            if (panel.Module is { } inside)
            {
                Place(inside, panel.Face);
                contents.Add(inside.Id);
            }

            foreach (var note in panel.Notes)
            {
                var card = new ClueModule(nextId++, note.Clue, note.TargetId);
                Place(card, panel.Face);
                contents.Add(card.Id);
            }

            Tool? hidden = panel.HoldsCutters ? Tool.WireCutters : null;
            Place(new SecretPanelModule(nextId++, FastenerType.Bolt, contents, hidden), panel.Face);
        }

        var scribbleFaces = bayFaces.ToList();
        rng.Shuffle(scribbleFaces);
        for (int i = 0; i < scribbles.Count; i++)
            Place(new ClueModule(nextId++, scribbles[i].Clue, scribbles[i].TargetId), scribbleFaces[i]);

        var faces = Shape.Faces
            .Select(layout => new Face(layout, placed.Where(m => m.FaceId == layout.Id).ToArray()))
            .ToArray();

        return new Bomb(date, seed, Shape, faces, solution);
    }

    private static List<PlannedCard> PlanCards<T>(
        int targetId, IReadOnlyList<T> candidates, IEnumerable<Clue<T>> trueClues, Mulberry32 rng)
    {
        var selection = ClueSelector.Select(candidates, trueClues, rng);
        var cards = selection.Essential.Select(c => new PlannedCard(c, targetId, Essential: true)).ToList();

        // False clue
        if (rng.NextBool())
        {
            var herring = selection.Redundant.FirstOrDefault(c =>
                c.Tier != ClueTier.Direct &&
                selection.Essential.All(e => !ClueSolver.IsUnique(candidates,
                    selection.Essential.Where(other => !ReferenceEquals(other, e)).Append(c))));
            if (herring is not null) cards.Add(new PlannedCard(herring, targetId, Essential: false));
        }

        return cards;
    }
}
