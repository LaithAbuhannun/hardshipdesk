namespace HardshipDesk.Api.Domain;

public enum RiskLevel
{
    OnTrack,
    Warning,
    Critical,
    Overdue,
    Met,
    Breached
}

public sealed record ClockInput(
    DateOnly ReceivedDate,
    DateOnly? InfoRequestedDate,
    DateOnly? InfoReceivedDate,
    DateOnly? RespondedDate);

public sealed record ClockResult(
    DateOnly InfoRequestDeadline,
    DateOnly ResponseDueDate,
    string RuleApplied,
    int DaysRemaining,
    RiskLevel Risk);

/// <summary>
/// The National Credit Code s72 hardship timeframes. The same rules run in SQL
/// (dbo.tvf_CaseClock) for reporting; this class is used to validate actions in the API
/// and is covered by unit tests so the rules are pinned down in one readable place.
/// </summary>
public static class StatutoryClock
{
    public const int InfoRequestWindowDays = 21;
    public const int ResponseDays = 21;
    public const int NoInformationResponseDays = 28;
    public const int VariationNoticeDays = 30;
    public const int ShortArrangementMaxDays = 90;
    public const int CriticalThresholdDays = 3;
    public const int WarningThresholdDays = 7;

    public static ClockResult Calculate(ClockInput input, DateOnly today)
    {
        var infoRequestDeadline = input.ReceivedDate.AddDays(InfoRequestWindowDays);

        DateOnly due;
        string rule;

        if (input.InfoRequestedDate is null)
        {
            due = input.ReceivedDate.AddDays(ResponseDays);
            rule = "21 days after the hardship notice was received";
        }
        else if (input.InfoReceivedDate is DateOnly infoReceived)
        {
            due = infoReceived.AddDays(ResponseDays);
            rule = "21 days after the requested information was received";
        }
        else
        {
            due = input.InfoRequestedDate.Value.AddDays(NoInformationResponseDays);
            rule = "28 days after information was requested (not yet received)";
        }

        var measuredFrom = input.RespondedDate ?? today;
        var daysRemaining = due.DayNumber - measuredFrom.DayNumber;

        return new ClockResult(infoRequestDeadline, due, rule, daysRemaining, ClassifyRisk(input.RespondedDate, daysRemaining));
    }

    public static RiskLevel ClassifyRisk(DateOnly? respondedDate, int daysRemaining)
    {
        if (respondedDate is not null)
        {
            return daysRemaining >= 0 ? RiskLevel.Met : RiskLevel.Breached;
        }

        return daysRemaining switch
        {
            < 0 => RiskLevel.Overdue,
            <= CriticalThresholdDays => RiskLevel.Critical,
            <= WarningThresholdDays => RiskLevel.Warning,
            _ => RiskLevel.OnTrack
        };
    }

    /// <summary>Returns an error message if information can no longer be requested, otherwise null.</summary>
    public static string? ValidateInformationRequest(DateOnly receivedDate, DateOnly requestDate)
    {
        if (requestDate < receivedDate)
        {
            return "The request date cannot be before the hardship notice was received.";
        }

        return requestDate > receivedDate.AddDays(InfoRequestWindowDays)
            ? "Information must be requested within 21 days of receiving the hardship notice (NCC s72)."
            : null;
    }

    /// <summary>
    /// Arrangements longer than 90 days need a written variation notice within 30 days of agreement.
    /// Returns null when no notice is required.
    /// </summary>
    public static DateOnly? VariationNoticeDueDate(DateOnly agreedDate, int arrangementDays) =>
        arrangementDays > ShortArrangementMaxDays ? agreedDate.AddDays(VariationNoticeDays) : null;
}
