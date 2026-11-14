# Bombdle

A daily bomb defusal puzzle in the browser, inspired by Wordle and Keep Talking and Nobody Explodes.
Everyone gets the same bomb each day. The server is written in C# and the client uses p5.js.

## Requirements

- .NET SDK 10

## Setup

The p5 library is not in the repository. Download it once after cloning.

```powershell
mkdir Bombdle.Server/wwwroot/lib
curl.exe -L -o Bombdle.Server/wwwroot/lib/p5.min.js https://cdn.jsdelivr.net/npm/p5@2.3.1/lib/p5.min.js
```

## Run

```powershell
dotnet run --project Bombdle.Server --urls http://localhost:5223
```

Open http://localhost:5223 in the browser. Add `?date=2026-10-28` to the address to play a past day.

## Other commands

```powershell
dotnet test Bombdle.sln
dotnet run --project Bombdle.Cli -- 2026-10-28 --solution
```

The first runs the tests. The second prints a puzzle and its solution in the console.
