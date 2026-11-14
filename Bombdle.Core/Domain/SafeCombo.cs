namespace Bombdle.Core.Domain;

using System.Globalization;

public readonly record struct SafeCombo(int Left, int Right)
{
    public override string ToString() => $"{Left}-{Right}";

    public static bool TryParse(string text, int dialSize, out SafeCombo combo)
    {
        combo = default;
        int dash = text.IndexOf('-');
        if (dash <= 0) return false;

        if (!int.TryParse(text.AsSpan(0, dash), NumberStyles.None, CultureInfo.InvariantCulture, out int left) ||
            !int.TryParse(text.AsSpan(dash + 1), NumberStyles.None, CultureInfo.InvariantCulture, out int right))
            return false;

        if (left < 1 || left > dialSize || right < 1 || right > dialSize) return false;

        combo = new SafeCombo(left, right);
        return true;
    }
}
