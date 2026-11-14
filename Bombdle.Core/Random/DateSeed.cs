namespace Bombdle.Core.Random;

using System.Globalization;
using System.Text;

/// <summary>
/// Turns a UTC date into the puzzle seed.
/// I used this method because its simple.
/// </summary>
public static class DateSeed
{
    public const string Format = "yyyy-MM-dd";

    private const uint FnvOffsetBasis = 2166136261u;
    private const uint FnvPrime = 16777619u;

    public static string ToKey(DateOnly date) => date.ToString(Format, CultureInfo.InvariantCulture);

    public static bool TryParseKey(string text, out DateOnly date) =>
        DateOnly.TryParseExact(text, Format, CultureInfo.InvariantCulture, DateTimeStyles.None, out date);

    public static uint FromDate(DateOnly date) => Hash(ToKey(date));

    public static uint Hash(string text)
    {
        uint hash = FnvOffsetBasis;
        foreach (byte b in Encoding.UTF8.GetBytes(text))
        {
            hash ^= b;
            hash *= FnvPrime;   
        }
        return hash;
    }
}
