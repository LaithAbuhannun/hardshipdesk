using Hangfire;
using HardshipDesk.Api.Data;
using HardshipDesk.Api.Domain;

namespace HardshipDesk.Api.Jobs;

/// <summary>
/// Runs every morning (Hangfire recurring job) and raises alerts for hardship cases that are
/// within 3 days of their statutory deadline or already past it, plus overdue variation notices.
/// The stored procedure is idempotent, so retries and manual re-runs never create duplicates.
/// </summary>
public sealed class DeadlineMonitorJob(ICaseRepository cases, IBusinessClock clock, ILogger<DeadlineMonitorJob> logger)
{
    public const string RecurringJobId = "hardship-deadline-monitor";

    [AutomaticRetry(Attempts = 3)]
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task<int> RunAsync()
    {
        var today = clock.Today;
        var created = await cases.FlagAtRiskCasesAsync(today);
        logger.LogInformation("Deadline monitor ran for {Today}: {AlertsCreated} new alert(s).", today, created);
        return created;
    }
}
