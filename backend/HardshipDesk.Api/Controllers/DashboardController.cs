using Hangfire;
using HardshipDesk.Api.Data;
using HardshipDesk.Api.Domain;
using HardshipDesk.Api.Jobs;
using HardshipDesk.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace HardshipDesk.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class DashboardController(ICaseRepository cases, IBusinessClock clock, IBackgroundJobClient jobs) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardRow>> Dashboard() => Ok(await cases.GetDashboardAsync(clock.Today));

    [HttpGet("alerts")]
    public async Task<ActionResult<IReadOnlyList<AlertRow>>> Alerts([FromQuery] bool includeAcknowledged = false) =>
        Ok(await cases.GetAlertsAsync(includeAcknowledged));

    [HttpPost("alerts/{id:int}/acknowledge")]
    public async Task<ActionResult> Acknowledge(int id)
    {
        await cases.AcknowledgeAlertAsync(id, User.Identity?.Name ?? "demo.user");
        return NoContent();
    }

    /// <summary>Queues the deadline monitor now instead of waiting for the 8am schedule.</summary>
    [HttpPost("jobs/deadline-monitor")]
    public ActionResult RunDeadlineMonitor()
    {
        var jobId = jobs.Enqueue<DeadlineMonitorJob>(job => job.RunAsync());
        return Accepted(new { jobId });
    }
}
