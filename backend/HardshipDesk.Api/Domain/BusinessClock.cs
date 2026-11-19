namespace HardshipDesk.Api.Domain;

/// <summary>
/// Statutory days are counted in the business's local calendar (Sydney), not UTC,
/// so a notice received at 9am AEDT is not counted as the previous day.
/// </summary>
public interface IBusinessClock
{
    DateOnly Today { get; }
}

public sealed class SydneyBusinessClock(TimeProvider time) : IBusinessClock
{
    private static readonly TimeZoneInfo Sydney = TimeZoneInfo.FindSystemTimeZoneById("Australia/Sydney");

    public DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(time.GetUtcNow(), Sydney).DateTime);

    public static TimeZoneInfo TimeZone => Sydney;
}
