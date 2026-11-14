using Bombdle.Core.Api;
using Bombdle.Core.Domain;
using Bombdle.Core.Generation;
using Bombdle.Core.Random;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<PuzzleGenerator>();
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(PuzzleMapper.EnumConverter));

var app = builder.Build();

const int MaxLoggedActions = 1000;

app.UseDefaultFiles();

var contentTypes = new FileExtensionContentTypeProvider();
contentTypes.Mappings[".obj"] = "model/obj";
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypes,
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "no-cache",
});

var generator = app.Services.GetRequiredService<PuzzleGenerator>();

(Bomb? Bomb, IResult? Error) LoadPuzzle(string date)
{
    if (!DateSeed.TryParseKey(date, out var parsed))
        return (null, Results.BadRequest(new { error = $"Invalid date '{date}'. Expected format: {DateSeed.Format}." }));

    if (parsed > DateOnly.FromDateTime(DateTime.UtcNow))
        return (null, Results.NotFound(new { error = $"The puzzle for {date} is not released yet." }));

    return (generator.Generate(parsed), null);
}

// Puzzle endpoints 

app.MapGet("/api/puzzle/today", () =>
    Results.Ok(PuzzleMapper.ToDto(generator.Generate(DateOnly.FromDateTime(DateTime.UtcNow)))));

app.MapGet("/api/puzzle/{date}", (string date) =>
{
    var (bomb, error) = LoadPuzzle(date);
    return error ?? Results.Ok(PuzzleMapper.ToDto(bomb!));
});

// POST /api/puzzle/{yyyy-MM-dd}/replay - judge a whole action log
app.MapPost("/api/puzzle/{date}/replay", (string date, ReplayRequest request) =>
{
    var (bomb, error) = LoadPuzzle(date);
    if (error is not null) return error;

    if (request.Actions is null || request.Actions.Any(a => a is null || a.Target is null))
        return Results.BadRequest(new { error = "Body must be { actions: [{ t, tool, moduleId, target }, ...] }." });
    if (request.Actions.Count > MaxLoggedActions)
        return Results.BadRequest(new { error = $"At most {MaxLoggedActions} actions per log." });

    return Results.Ok(ReplayMapper.Replay(bomb!, request.Actions));
});


// unknown /api paths return JSON 404.

app.MapFallback(async context =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsJsonAsync(new { error = "Not found." });
        return;
    }

    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(
        Path.Combine(app.Environment.WebRootPath, "index.html"));
});

app.Run();
